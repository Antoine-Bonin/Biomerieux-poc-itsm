import express from 'express' 
import type { Request , Response, NextFunction } from 'express'
import { z } from 'zod'
import crypto from 'crypto'

const TicketSchema = z.object({
    ticketId: z.string().min(1, "ID ticket required"),
    eployeeId: z.string().min(1),
    trainingName: z.string().min(1),
    requestedAt: z.string().optional()
});

type ServiceNowTicketPayload = z.infer<typeof TicketSchema>

const escapeXml = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
     .replace(/"/g, '&quot;').replace(/'/g, '&apos;');

const app = express()
const PORT = 3000;

app.use(express.json())



app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({status: 'OK', services: 'ITSM-Integration-PoC'});
})

const sailpointDB: Record<string, any>= {
    "USR_789": {name: "Alice Dupont", department: "R&D", isActive: true },
    "USR_404": {name: "Bob Martin", department: "Logistics", isActive: false}
};

app.get('/api/sailpoint/:employeeId', (req: Request, res: Response) => {
    const id = req.params.employeeId as string;
    const user = sailpointDB[id];
    if (user) {
        res.status(200).json(user);
    } else {
        res.status(400).json({ error: "employee not found in SailPoint"})
    }
})

app.post('/api/webhook/servicenow', async (req: Request<{}, {}, ServiceNowTicketPayload>, res: Response) => {
    const ticket = req.body;
    if (!ticket.employeeId || !ticket.trainingName) {
        res.status(400).json({ error: 'Payload invalid : employeeId & TrainingName required'});
        return;
    }
    console.log(`\n[SERVICENOW WEBHOOK] Nouveau ticket reçu : ${ticket.ticketId}`);
    console.log(` -> Employé : ${ticket.employeeId} | Formation : ${ticket.trainingName}`);
    try {
        const sailpointResponse = await fetch(`http://localhost:${PORT}/api/sailpoint/${ticket.employeeId}`);
        if (!sailpointResponse.ok){
            console.log("employee not known in SailPoint.");
            res.status(404).json({decision: "Rejected", reason: "User not found in IIQ"})
            return ;
        }
        const identity = await sailpointResponse.json();
        console.log(`identity found : ${identity.name} (${identity.department}) - active: ${identity.isActive}`);

        let finalDecision = "REJECTED"
        if (identity.isActive === true)
        {
            finalDecision = "APPROVED"
            console.log(`Automated decision : Approved.`)
        }else {
            console.log("Automated decision: Rejected (account is inactive");
        }
        const teamsPayload = {
            "@type": "MessageCard",
            "@context": "http://schema.org/extensions",
            "themeColor": finalDecision === "APPROVED" ? "00FF00" : "FF0000",
            "summary": "ServiceNow notification",
            "sections": [{
                "activityTitle": `Ticket update ${ticket.ticketId}`,
                "text": `Automated decision : **${finalDecision}** for the employee ${identity.name} (${identity.department})`
            }]
        };
        console.log("\n[MICROSOFT TEAMS] Payload ready to be sent to the GRAPH API:");
        console.log(JSON.stringify(teamsPayload, null, 2));

        const soapXML = `
            <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
            <soapenv:Body>
            <TicketResponse>
            <TicketId>${ticket.ticketId}</TicketId>
            <Decision>${finalDecision}</Decision>
            <SailpointVerified>true</SailpointVerified>
            </TicketResponse>
            </soapenv:Body>
            </soapenv:Envelope>
            `;

            res.set('Content-Type', 'text/html');
            res.status(200).send(soapXML.trim());
    } catch (error) {
        console.error("Network error:", error);
        res.status(500).json({ error: "internal server error"});
    }
});

app.listen(PORT, () => {
    console.log(`ITSM PoC Server started at http://localhost:${PORT}`)
})