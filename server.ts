import { start as startServer } from 'verifiable-credential-issuer';

import ATPDataManifest from "./credential-manifests/ATP-DATA.json";
import ATPReportManifest from "./credential-manifests/ATP-REPORT.json";

import { decryptRIKI, requestAndAwaitRIKI } from './lib/ATP';

async function start() {
    await startServer({
        credentials: [{
            manifest: ATPDataManifest,
            handler: requestAndAwaitRIKI
        },
        {
            manifest: ATPReportManifest,
            handler: decryptRIKI
        }]
    });
}

start();
