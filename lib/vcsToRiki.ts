import config from "../config/index.js"
import { VerifiableCredentialTypeV1 } from 'web5-service'

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

export function convertVCsToRikiRequest({ identityVCs = [], accountVCs = [], transactionVCs = [] }: { identityVCs: VerifiableCredentialTypeV1[], accountVCs: VerifiableCredentialTypeV1[], transactionVCs: VerifiableCredentialTypeV1[] }) {
    const trustedIssuers = config.trustedIssuers.map(o => o.did);

    if (!identityVCs.length || !accountVCs.length || transactionVCs.length == 0) {
        throw new Error('Please provide IdentityCredential, BankAccountCredential, and transactions credential')
    }

    // Use first identity VC for parsing identity
    const identityVC = identityVCs[0];
    const identityVCSubject = identityVC.payload.credentialSubject as any;

    // console.log('Identity VC', identityVCSubject);

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
        const accountVCSubject = accountVC.payload.credentialSubject as any;
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

            // Loop through all transaction VCs and find transactions for account
            for (const transactionVC of transactionVCs) {
                console.log('Transaction VC', JSON.stringify(transactionVC, null, 2))
                const transactionVCSubject = transactionVC.payload.credentialSubject as any;
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
                            action: transaction[transactionType].debitCreditMemo.toLowerCase(),
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
                dataSourceId: "", // TODO: Not sure what this is
                externalAccountId: account[accountType].accountId,
                currentBalance: account[accountType].currentBalance,
                currentBalanceDate: account[accountType].balanceAsOf,
                availableBalance: account[accountType].availableBalance,
                availableBalanceDate: account[accountType].balanceAsOf,
                transactions: rikiTransactions
            }

            accounts.push(rikiAccount);
        }
    }

    const institution: RIKIInstitution = {
        externalInstitutionId: "", // TODO: Cannot get from VC?
        name: "", // TODO: Cannot get from VC?
        accounts
    }

    institutions.push(institution)

    return {
        requestType: "RIKI",
        responseFormat: ["json"],
        consumerInformation,
        institutions,
    }
}

