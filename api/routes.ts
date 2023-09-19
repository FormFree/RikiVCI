import * as Joi from "joi";
import { requestRIKI } from "./controller"

export const routes = [
    {
        method: "POST",
        path: "/api/v1/riki/report",
        config: {
            handler: requestRIKI,
            description: "Requests the Riki analytics to be run on a Verifiable Presentation of transaction data.",
            tags: ["api", "riki"],
            validate: {
                // headers: Joi.object({
                //     "X-Request-Signature": Joi.string().required(),
                // }).unknown(),
                payload: Joi.object({
                    "@context": Joi.array().items(Joi.string()).required(),
                    type: Joi.array().items(Joi.string()).required(),
                    id: Joi.string(),
                    holder: Joi.string(),
                    verifiableCredential: Joi.array().items(Joi.object()).required()
                }),
            }
        }
    }
]