import * as Lab from '@hapi/lab';
import { expect } from '@hapi/code'

import { service, init, stop } from '../service'

import accountVC from './assets/accountVC.json'
import identityVC from './assets/identityVC.json'
import transactionVC1 from './assets/transactionVC1.json'
import transactionVC2 from './assets/transactionVC2.json'
import transactionVC3 from './assets/transactionVC3.json'
import transactionVC4 from './assets/transactionVC4.json'
import transactionVC5 from './assets/transactionVC5.json'

const lab = Lab.script();
const { describe, it, afterEach, before, beforeEach } = lab;
export { lab };

function createVP(verifiableCredential: any[]) {
    return {
        "@context": [
            "https://www.w3.org/2018/credentials/v1"
        ],
        type: [
            "VerifiablePresentation"
        ],
        verifiableCredential
    }
}

describe('API', () => {
    beforeEach(async () => {
        await init();
    });

    afterEach(async () => {
        await stop();
    });

    it('should accept Verifiable Presentation', async () => {
        const vp = createVP([identityVC, accountVC, transactionVC1, transactionVC2, transactionVC3, transactionVC4, transactionVC5])

        const res = await service.inject({
            method: 'post',
            url: '/api/v1/riki/report',
            payload: vp
        });

        expect(res.statusCode).to.equal(200);
    })
})