import { Request, ResponseToolkit } from "@hapi/hapi";
import fetch from "node-fetch";

import config from "../config"

type VerifiableCredential = {
    "@context": string[];
    type: string[];
    id?: string;
    issuer: string;
    credentialSubject: any | any[];
}

type VerifiablePresentation = {
    "@context": string[];
    type: string[];
    id?: string;
    holder?: string;
    verifiableCredential: VerifiableCredential[];
}

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

export async function requestRIKI(req: Request, h: ResponseToolkit) {
    const verifiablePresentation = <VerifiablePresentation>req.payload;

    // Accept v1 Verifiable Presentation as JSON-LD
    let identityVC
    let accountsVC
    let transactionVCs = [];

    for (const verifiableCredential of verifiablePresentation.verifiableCredential) {
        const trustedIssuers = config.trustedIssuers.map(o => o.did);

        if (!trustedIssuers.includes(verifiableCredential.issuer)) {
            throw new Error(`Credential contains untrusted issuer: ${verifiableCredential.issuer}`)
        }

        // TODO: Verify issuer signature

        // Select credentials by type
        if (verifiableCredential.credentialSubject.transactions) {
            transactionVCs.push(verifiableCredential)
        } else if (verifiableCredential.type.includes("IdentityCredential")) {
            identityVC = verifiableCredential
        } else if (verifiableCredential.type.includes("BankAccountCredential")) {
            accountsVC = verifiableCredential
        }
    }

    if (!identityVC || !accountsVC || transactionVCs.length == 0) {
        throw new Error('Please provide IdentityCredential, BankAccountCredential, and transactions credential')
    }

    // get RIKI consumer info from identity VC
    const consumerInformation = {
        firstName: identityVC.credentialSubject.customer.name.first,
        lastName: identityVC.credentialSubject.customer.name.last,
        email: identityVC.credentialSubject.customer.email,
        phoneNumber: identityVC.credentialSubject.customer.phone?.[0]?.number,
        address: {
            street: identityVC.credentialSubject.customer.addresses?.[0]?.line1,
            street2: identityVC.credentialSubject.customer.addresses?.[0]?.line2,
            city: identityVC.credentialSubject.customer.addresses?.[0]?.city,
            postalCode: identityVC.credentialSubject.customer.addresses?.[0]?.postalCode,
            country: identityVC.credentialSubject.customer.addresses?.[0]?.country,
            region: identityVC.credentialSubject.customer.addresses?.[0]?.state,
        },
        associatedCustomerId: identityVC.credentialSubject.customer.customerId
    }

    // get RIKI institutions from account and transaction VCs
    const institutions: RIKIInstitution[] = [];
    const accounts: RIKIAccount[] = [];

    for (const account of accountsVC.credentialSubject.accounts) {
        const transactions: RIKITransaction[] = [];
        const rikiAccount: RIKIAccount = {
            accountNumber: account.depositeAccount.accountNumber,
            accountType: account.depositeAccount.accountType,
            currencyCode: account.depositeAccount.currency,
            dataSourceId: "", // Not sure what this is
            externalAccountId: account.depositeAccount.accountId,
            currentBalance: account.depositeAccount.currentBalance,
            currentBalanceDate: account.depositeAccount.balanceAsOf,
            availableBalance: account.depositeAccount.availableBalance,
            availableBalanceDate: account.depositeAccount.balanceAsOf,
            transactions
        }

        // TODO: Loop through all transaction VCs and find transactions for account
        for (const transactionVC of transactionVCs) {

        }

        accounts.push(rikiAccount);
    }

    const insitution: RIKIInstitution = {
        externalInstitutionId: "", // Cannot get from VC?
        name: "", // Cannot get from VC?
        accounts
    }

    const request = {
        requestType: "RIKI",
        responseFormat: "json",
        consumerInformation,
        institutions,
    }

    // Request RIKI report
    // TODO: send X-CustomerId in header
    const rikiResponse = await fetch(config.rikiAPI, {
        method: 'POST',
        body: JSON.stringify(request),
        headers: { 'Content-Type': 'application/json' }
    })

    const riki = await rikiResponse.json();

    console.log(riki)

    // TODO: Use Web5 libraries to generate a v2 VC as JWT

    const reponse = {};

    return h.response(reponse)
}