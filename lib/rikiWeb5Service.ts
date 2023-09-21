import config from '../config/index.js'

import { Web5Service, DwnRequest, DwnResponse } from 'web5-service';
import { DwnInterfaceName, DwnMethodName, RecordsWriteMessage } from '@tbd54566975/dwn-sdk-js';
import { Temporal } from '@js-temporal/polyfill';

import { encrypt, decrypt } from './encryption.js'

import { v4 as uuidv4 } from 'uuid';

import { convertVCsToRikiRequest } from './vcsToRiki.js';

import jethro from '../test/assets/jethroTull_request.json' assert { type: 'json' };
import jethroRes from '../test/assets/rikiResJethro.json' assert { type: 'json' };
import { rikiProtocol } from '../protocol/riki.js';

const isRikiCreateRequest = (dwnRequest: any) => dwnRequest.message.descriptor.interface === 'Records' &&
    dwnRequest.message.descriptor.method === 'Write' &&
    dwnRequest.message.descriptor.schema === 'https://tblend.io/protocol/riki/create-request.schema.json';

const isRikiReportRequest = (dwnRequest: any) => dwnRequest.message.descriptor.interface === 'Records' &&
    dwnRequest.message.descriptor.method === 'Write' &&
    dwnRequest.message.descriptor.schema === 'https://tblend.io/protocol/riki/report-request.schema.json';

const isRikiDecryptRequest = (dwnRequest: any) => dwnRequest.message.descriptor.interface === 'Records' &&
    dwnRequest.message.descriptor.method === 'Write' &&
    dwnRequest.message.descriptor.schema === 'https://tblend.io/protocol/riki/decrypt-request.schema.json';

export function getCurrentTimeInHighPrecision(): string {
    return Temporal.Now.instant().toString({ smallestUnit: 'microseconds' });
}

export class Web5RikiService extends Web5Service {

    constructor() {
        super();
        this.addHandler(isRikiCreateRequest, this.requestRIKI.bind(this));
        this.addHandler(isRikiReportRequest, this.getRIKI.bind(this));
        this.addHandler(isRikiDecryptRequest, this.decryptRIKI.bind(this));
    }

    async requestRIKI(request: DwnRequest): Promise<DwnResponse> {
        const { accountVCs, identityVCs, transactionVCs } = request.payload;

        try {
            // @ts-ignore type is incorrect for signature?
            const signatureEntry = request.message.authorization.signatures[0];
            const senderDid = this.getJwsSignerDid(signatureEntry);

            // for (const credential of [...accountVCs, ...identityVCs, ...transactionVCs]) {
            //     // TODO: Temporary fix for extra tilde
            //     let cleanedCredential = credential as string;
            //     cleanedCredential = cleanedCredential.replace("~", "");

            //     await this.verifyVC(cleanedCredential);
            //     // await this.verifyVC(credential);
            // }

            const accountVCsJSON = accountVCs.map((jwt: string) => this.decodeVC(jwt));
            const identityVCsJSON = identityVCs.map((jwt: string) => this.decodeVC(jwt));
            const transactionVCsJSON = transactionVCs.map((jwt: string) => this.decodeVC(jwt));

            // TODO: Temporary for demo
            let rikiRequest;
            if (config.environment === 'Development') {
                rikiRequest = jethro;
            } else {
                rikiRequest = convertVCsToRikiRequest({ accountVCs: accountVCsJSON, identityVCs: identityVCsJSON, transactionVCs: transactionVCsJSON });
            }

            const customerId = uuidv4();

            // TODO: Temporary for demo
            let rikiResponse;
            if (config.environment === 'demo') {
                rikiResponse = {
                    isSuccessful: true,
                    timeOfRequest: '2023-09-28T17:29:38.7484069Z',
                    status: 'Recieved',
                    rikiId: 'riki_c2588f30-dc43-4219-ae1f-abf6b1da4fe4'
                }
            } else {
                // Request RIKI report
                const rikiResponseRaw = await fetch(`${config.rikiAPI}`, {
                    method: 'POST',
                    body: JSON.stringify(rikiRequest),
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CustomerId': customerId
                    }
                })

                rikiResponse = await rikiResponseRaw.json();
            }

            // write incoming message to dwn
            await this.dwn?.processMessage(`${this.identity?.did}`, request.message, request.payload);

            const data = JSON.stringify({
                customerId,
                rikiId: rikiResponse.rikiId
            })

            // write response to local DWN first
            const response = await this.processDwnRequest({
                target: `${this.identity?.did}`,
                store: false,
                author: `${this.identity?.did}`,
                messageOptions: {
                    data: Buffer.from(data),
                    dataFormat: 'application/json',
                    protocol: rikiProtocol.message.definition.protocol,
                    protocolPath: 'rikiCreateRequest/rikiCreateResponse',
                    schema: 'https://tblend.io/protocol/riki/create-response.schema.json',
                    recipient: senderDid,
                    //@ts-ignore Type is wrong?
                    parentId: request.message.recordId,
                    //@ts-ignore Type is wrong?
                    contextId: request.message.contextId
                },
                messageType: DwnInterfaceName.Records + DwnMethodName.Write,
            });

            // TODO: this is a hack to make the authz match dwn-sdk 0.2.1. Can remove when web5-js uses a newer dwn-sdk
            let message: any = Object.assign({}, response.message);
            message.authorization = message.authorization.authorSignature;

            // send the dwn response back to requesting DID
            await this.client.send(senderDid, message as RecordsWriteMessage, data);

            return {
                reply: {
                    status: {
                        code: 202,
                        detail: 'Accepted'
                    }

                }
            };
        } catch (e: any) {
            console.error(e);

            return {
                reply: this.messageReplyFromError(e, 500),
            }
        }
    }

    async getRIKI(request: DwnRequest) {
        console.log('Get Riki request', JSON.stringify(request, null, 2))
        // const { customerId, rikiId } = req.params;

        // if (!web5.identity) {
        //     await web5.init({});
        // }

        // let rikiResponse;
        // if (config.environment === 'demo') {
        //     rikiResponse = jethroRes.rikiResponse;
        // } else {
        //     // Request RIKI report
        //     // Get RIKI report
        //     const rikiResponseRaw = await fetch(`${config.rikiAPI}/${rikiId}`, {
        //         method: 'GET',
        //         headers: {
        //             'Content-Type': 'application/json',
        //             'X-CustomerId': customerId
        //         }
        //     })

        //     rikiResponse = await rikiResponseRaw.json();
        // }

        // if (rikiResponse.rikiResultSet) {

        //     try {
        //         const summaryVerifiableCredential = await web5.createVC({
        //             credentialSubject: rikiResponse.rikiResultSet.rikiData,
        //             subjectDid: '',
        //             type: 'RIKIAnalyticsSummary'
        //         });

        //         const message = JSON.stringify(rikiResponse.rikiResultSet);
        //         const encrypted = encrypt(message);

        //         const encryptedVerifiableCredential = await web5.createVC({
        //             credentialSubject: { encrypted },
        //             subjectDid: '',
        //             type: 'RIKIAnalyticsEncrypted'
        //         })

        //         return h.response({ summaryVerifiableCredential, encryptedVerifiableCredential })
        //     } catch (e: any) {
        //         console.error(e)
        //         return h.response({ error: e.message }).code(500);
        //     }
        // }

        // console.log('No riki result set')
        // return h.response(rikiResponse).code(202)
    }

    // TODO: Decryption should require payment
    async decryptRIKI(request: DwnRequest) {
        console.log('Decrypt request', JSON.stringify(request, null, 2))
        // const { jwt } = <{ jwt: string }>req.payload;

        // if (!web5.identity) {
        //     await web5.init({});
        // }

        // try {
        //     const verified = await web5.verifyVC(jwt);
        //     if (!verified) throw new Error('Invalid JWT');

        //     const vc = web5.decodeVC(jwt);

        //     const credentialSubject: any = vc.payload.vc?.credentialSubject;

        //     const encrypted = credentialSubject?.encrypted;
        //     const decrypted = decrypt(encrypted);

        //     const verifiableCredential = await web5.createVC({
        //         credentialSubject: JSON.parse(decrypted.toString()),
        //         subjectDid: '',
        //         type: 'RIKIAnalyticsDecrypted'
        //     });

        //     return h.response({ verifiableCredential })

        // } catch (e: any) {
        //     console.error(e)
        //     return h.response({ error: e.message }).code(500);
        // }
    }
}