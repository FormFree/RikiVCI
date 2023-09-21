import config from './config/index.js';
import { Web5RikiService } from './lib/rikiWeb5Service.js';
import { rikiProtocol } from './protocol/index.js';

const web5Service = new Web5RikiService();

async function start() {
    await web5Service.start({
        configFile: config.web5Configfile,
        levelDbDir: config.levelDbDir,
        dwnServiceEndpoints: config.dwnServiceEndpoints,
        port: config.port,
    });

    const protocolConfigured = await web5Service.queryProtocol({
        message: {
            filter: {
                protocol: rikiProtocol.message.definition.protocol
            }
        }
    })

    if (!protocolConfigured.reply.entries?.length) {
        await web5Service.configureProtocol(rikiProtocol)
    }
}

start().then(() => {
    console.log('Started DWN service on port ' + config.port);
    console.log('External Url configured as ' + config.externalUrl);
    console.log('Using DID for service ' + web5Service.identity?.canonicalId);
    console.log('Long form DID', web5Service.identity?.did);
    console.log('DWN Service Endpoints configured as ' + config.dwnServiceEndpoints);
})
