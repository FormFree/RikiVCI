import pkg from "../package.json";

const environment =
    process.env.ENVIRONMENT || process.env.NODE_ENV || "development";

let scheme = "https";
const externalHostname = process.env.EXTERNAL_HOSTNAME || "localhost";
const externalPort = parseInt(`${process.env.EXTERNAL_PORT}`) || 3000;
const serviceName = process.env.SERVICE_NAME || pkg.name;

let swaggerHost = externalHostname;
if (externalPort !== 443) {
    swaggerHost = `${swaggerHost}:${externalPort}`;
}

const config = {
    externalHostname,
    port: Number(process.env.PORT) || 3001,
    rikiAPI: process.env.RIKI_SERVICE_ENDPOINT || "https://x1toskusdl.execute-api.us-east-1.amazonaws.com/v1/Riki/report",
    swagger: {
        grouping: "tags",
        host: swaggerHost,
        info: {
            title: `${serviceName} Documentation`,
            version: pkg.version,
        },
        schemes: [scheme],
        jsonPath: "/api/swagger.json",
        documentationPath: "/api/documentation",
        swaggerUIPath: "/api/swaggerui",
    },
    trustedIssuers: [{
        name: "sophtron",
        did: "did:ion:EiDPbz2t9aw5u8GRCRyyY090Gk3vSHmsZFLYgVnBurOMEw"
    }]
}

export default config;