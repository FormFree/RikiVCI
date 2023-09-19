import { server } from "@hapi/hapi";
import config from "./config";

import Inert from "@hapi/inert";
import Vision from "@hapi/vision";

import HapiSwagger from "hapi-swagger";

import { routes } from "./api/routes";

export const service = server({
    address: "0.0.0.0",
    port: config.port,
    routes: {
        cors: true,
    },
});

// healthcheck route
service.route({
    method: "GET",
    path: "/",
    handler: () => {
        return "Ok";
    },
});

let stopping = false;

export const setup = async () => {
    await service.register([
        { plugin: Inert },
        { plugin: Vision },
        { plugin: HapiSwagger, options: config.swagger },
    ]);

    service.route(routes);
};

//used for tests instead of start()
export const init = async () => {
    await setup();
    await service.initialize();
};

export const start = async () => {
    await setup();
    await service.start();

    console.log("Server running on %s", service.info.uri);
};

export const stop = async () => {
    if (!stopping) {
        console.log("Stopping server...");
        stopping = true;
        await service.stop();
        console.log("Server stopped.");
    }
};