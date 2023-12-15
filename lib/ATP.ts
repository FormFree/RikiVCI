import { Signer } from "verifiable-credential-issuer";
import { PresentationExchange, VerifiableCredential } from '@web5/credentials';

import { retry } from './util';

import ATPDataManifest from "../credential-manifests/ATP-DATA.json";
import ATPReportManifest from "../credential-manifests/ATP-REPORT.json";

import config from "../config/index.js"
import { decrypt, encrypt } from "./encryption";

type RIKITransaction = {
    externalTransactionId: string;
    date: Date;
    description: string;
    action: string;
    amount: number;
}

type RIKIAccount = {
    accountNumber: string;
    accountType: string;
    currencyCode: string;
    dataSourceId: string;
    externalAccountId: string;
    currentBalance: number;
    currentBalanceDate: Date;
    availableBalance: number;
    availableBalanceDate: Date;
    transactions: RIKITransaction[];
}

type RIKIInstitution = {
    externalInstitutionId: string;
    name: string;
    accounts: RIKIAccount[];
}

export async function requestAndAwaitRIKI(presentation: any, issuerDid: string, subjectDid: string, kid: string, signer: Signer) {
    // validate each credential
    for (const credential of presentation.verifiableCredential) {
        await VerifiableCredential.verify(credential);
    }

    // filter valid creds
    const selectedCreds = PresentationExchange.selectCredentials(presentation, ATPDataManifest.presentation_definition)

    const trustedIssuers = config.trustedIssuers.map(o => o.did);

    const identityVCs = []
    const accountVCs = []
    const transactionVCs = []

    for (const credentialJwt in selectedCreds) {
        const vc = VerifiableCredential.parseJwt(credentialJwt);
        // TODO: Verify credential subject id is same as subjectId
        // console.log('vcJson', vc.vcDataModel.credentialSubject);

        const issuerDid = vc.vcDataModel.issuer;

        if (trustedIssuers.includes(issuerDid as string)) {
            if (vc.vcDataModel.type.includes('IdentityCredential')) {
                identityVCs.push(vc);
            } else if (vc.vcDataModel.type.includes('BankAccountCredential')) {
                accountVCs.push(vc);
            } else if (vc.vcDataModel.type.includes('TransactionCredential')) {
                transactionVCs.push(vc);
            }
        }
    }

    const rikiRequest = convertVCsToRikiRequest({ identityVCs, accountVCs, transactionVCs });

    // request riki report
    const rikiRequestResponse = await requestRIKI(rikiRequest);

    // await report to be generated
    const rikiReportResponse = await retry(async () => {
        return await getRIKI(rikiRequestResponse);
    }, { retries: 20, retryIntervalMs: 1500 })

    // generate VCs
    const summaryVC = VerifiableCredential.create({
        type: 'ATPReportSummary',
        issuer: issuerDid,
        subject: subjectDid,
        data: rikiReportResponse.rikiResultSet.rikiData,
    });

    const signOptions = {
        issuerDid,
        subjectDid,
        kid,
        signer
    };

    const summaryVCJwt = await summaryVC.sign(signOptions);

    const unencrypted = JSON.stringify(rikiReportResponse.rikiResultSet);
    const encrypted = encrypt(unencrypted);

    const encryptedVC = VerifiableCredential.create({
        type: 'ATPReportEncrypted',
        issuer: issuerDid,
        subject: subjectDid,
        data: { encrypted },
    });

    const encryptedVCJwt = await encryptedVC.sign(signOptions);

    return {
        fulfillment: {
            descriptor_map: [
                {
                    "id": "atp-report-summary",
                    "format": "jwt_vc",
                    "path": "$.verifiableCredential[0]"
                },
                {
                    "id": "atp-report-encrypted",
                    "format": "jwt_vc",
                    "path": "$.verifiableCredential[1]"
                },
            ]
        },
        verifiableCredential: [summaryVCJwt, encryptedVCJwt]
    }

}

export function convertVCsToRikiRequest({ identityVCs = [], accountVCs = [], transactionVCs = [] }: { identityVCs: VerifiableCredential[], accountVCs: VerifiableCredential[], transactionVCs: VerifiableCredential[] }) {

    if (!identityVCs.length || !accountVCs.length || transactionVCs.length == 0) {
        throw new Error('Please provide IdentityCredential, BankAccountCredential, and transactions credential')
    }

    // Use first identity VC for parsing identity
    const identityVC = identityVCs[0];
    const identityVCSubject = identityVC.vcDataModel.credentialSubject as any;

    // get RIKI consumer info from identity VC
    const consumerInformation = {
        firstName: identityVCSubject.customer.name.first,
        lastName: identityVCSubject.customer.name.last,
        email: identityVCSubject.customer.email,
        phoneNumber: identityVCSubject.customer.phone?.[0]?.number,
        address: {
            street: identityVCSubject.customer.addresses?.[0]?.line1,
            street2: identityVCSubject.customer.addresses?.[0]?.line2,
            city: identityVCSubject.customer.addresses?.[0]?.city,
            postalCode: identityVCSubject.customer.addresses?.[0]?.postalCode,
            country: identityVCSubject.customer.addresses?.[0]?.country,
            region: identityVCSubject.customer.addresses?.[0]?.state,
        },
        associatedCustomerId: identityVCSubject.customer.customerId
    }

    // get RIKI institutions from account and transaction VCs
    const institutions: RIKIInstitution[] = [];
    const accounts: RIKIAccount[] = [];

    for (const accountVC of accountVCs) {
        let institution: RIKIInstitution = {
            externalInstitutionId: "",
            name: "",
            accounts
        }

        const accountVCSubject = accountVC.vcDataModel.credentialSubject as any;
        for (const account of accountVCSubject.accounts) {

            const rikiTransactions: RIKITransaction[] = [];
            let rikiAccount: RIKIAccount;
            let accountType = "";
            if (account.depositAccount) {
                accountType = "depositAccount"
            } else if (account.loanAccount) {
                accountType = "loanAccount"
            } else if (account.locAccount) {
                accountType = "locAccount"
            } else if (account.investmentAccount) {
                accountType = "investmentAccount"
            } else if (account.insuranceAccount) {
                accountType = "insuranceAccount"
            } else if (account.annuityAccount) {
                accountType = "annuityAccount"
            } else if (account.commercialAccount) {
                accountType = "commercialAccount"
            } else {
                throw new Error('Cannot determine the account type')
            }

            institution.externalInstitutionId = account[accountType].fiAttributes.institution_id;
            institution.name = account[accountType].fiAttributes.institution_name;

            // Loop through all transaction VCs and find transactions for account
            for (const transactionVC of transactionVCs) {
                // console.log('Transaction VC', JSON.stringify(transactionVC, null, 2))
                const transactionVCSubject = transactionVC.vcDataModel.credentialSubject as any;
                if (transactionVCSubject.id.includes(account[accountType].accountId)) {
                    for (const transaction of transactionVCSubject.transactions) {
                        let rikiTransaction: RIKITransaction;
                        let transactionType = "";
                        if (transaction.depositTransaction) {
                            transactionType = "depositTransaction";
                        } else if (transaction.loanTransaction) {
                            transactionType = "loanTransaction";
                        } else if (transaction.locTransaction) {
                            transactionType = "locTransaction";
                        } else if (transaction.investmentTransaction) {
                            transactionType = "investmentTransaction";
                        } else if (transaction.insuranceTransaction) {
                            transactionType = "insuranceTransaction";
                        } else if (transaction.commercialTransaction) {
                            transactionType = "commercialTransaction"
                        } else {
                            throw new Error('Cannot determine the transaction type')
                        }

                        rikiTransaction = {
                            externalTransactionId: transaction[transactionType].transactionId,
                            date: transaction[transactionType].transactionTimestamp,
                            description: transaction[transactionType].description,
                            action: transaction[transactionType].transactionType.toLowerCase(),
                            amount: transaction[transactionType].amount
                        }

                        rikiTransactions.push(rikiTransaction)
                    }
                }
            }

            let accountTypeString;

            if (account[accountType].accountType == 'Checking') {
                accountTypeString = 'DDA'
            } else if (account[accountType].accountType == 'Savings') {
                accountTypeString = 'SDA'
            } else if (account[accountType].accountType == 'Investment') {
                accountTypeString = 'INV'
            } else if (account[accountType].accountType == 'Credit_Card') {
                accountTypeString = 'CCA'
            } else {
                accountTypeString = "Other"
            }

            rikiAccount = {
                accountNumber: account[accountType].accountNumber,
                accountType: accountTypeString,
                currencyCode: account[accountType].currency,
                dataSourceId: account[accountType].accountId,
                externalAccountId: account[accountType].accountId,
                currentBalance: account[accountType].currentBalance,
                currentBalanceDate: account[accountType].balanceAsOf,
                availableBalance: account[accountType].availableBalance,
                availableBalanceDate: account[accountType].balanceAsOf,
                transactions: rikiTransactions
            }

            institution.accounts.push(rikiAccount);
        }

        institutions.push(institution)
    }

    return {
        requestType: "RIKI",
        responseFormat: ["json"],
        consumerInformation,
        institutions,
    }
}

export async function requestRIKI(rikiRequest: any) {
    // TODO: Use DID for customer ID?
    const customerId = crypto.randomUUID();

    // Request RIKI report
    const rikiResponseRaw = await fetch(`${config.rikiAPI}`, {
        method: 'POST',
        body: JSON.stringify(rikiRequest),
        headers: {
            'Content-Type': 'application/json',
            'X-CustomerId': customerId
        }
    })

    const rikiResponse = await rikiResponseRaw.json();
    console.log('Got RIKI Response', JSON.stringify(rikiResponse, null, 2));

    const response = {
        customerId,
        rikiId: rikiResponse.rikiId
    }

    return response;
}

export async function getRIKI(rikiResponse: any) {
    const { customerId, rikiId } = rikiResponse;

    // Get RIKI report
    const rikiResponseRaw = await fetch(`${config.rikiAPI}/${rikiId}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'X-CustomerId': customerId
        }
    })

    const rikiReportResponse = await rikiResponseRaw.json();

    if (!rikiReportResponse.rikiResultSet) {
        throw new Error('RIKI report not ready')
    }
    return rikiReportResponse;
}

// TODO: Decryption should require payment
export async function decryptRIKI(presentation: any, issuerDid: string, subjectDid: string, kid: string, signer: Signer) {
    for (const credential of presentation.verifiableCredential) {
        await VerifiableCredential.verify(credential);
    }

    // filter valid creds
    const selectedCreds = PresentationExchange.selectCredentials(presentation, ATPReportManifest.presentation_definition)

    const credentialJwt = selectedCreds[0];
    const vc = VerifiableCredential.parseJwt(credentialJwt);
    const credentialSubject: any = vc.vcDataModel.credentialSubject;

    const encrypted = credentialSubject?.encrypted;
    const decrypted = decrypt(encrypted);

    // generate VCs
    const decryptedVC = VerifiableCredential.create({
        type: 'ATPReport',
        issuer: issuerDid,
        subject: subjectDid,
        data: JSON.parse(decrypted.toString()),
    });

    const signOptions = {
        issuerDid,
        subjectDid,
        kid,
        signer
    };

    const decryptedVCJwt = await decryptedVC.sign(signOptions);

    return {
        fulfillment: {
            descriptor_map: [
                {
                    "id": "atp-report",
                    "format": "jwt_vc",
                    "path": "$.verifiableCredential[0]"
                },
            ]
        },
        verifiableCredential: [decryptedVCJwt]
    }
}