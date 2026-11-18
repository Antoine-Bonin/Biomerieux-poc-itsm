import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import process from 'node:process';
import { Buffer } from 'node:buffer';
 
const app = express();
const PORT = 3000;
app.use(express.json());

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "default_fallback_secret_do_not_use_in_prod";

const verifyWebhookSecret = (req: Request, res: Response, next: NextFunction) => {
    const headerSecret = req.header('x-webhook-secret');
    if (!headerSecret) {
        res.status(401).json({ error: 'Access denied: missing header' });
        return;
    }
    try {
        const bufferExpected = Buffer.from(WEBHOOK_SECRET);
        const bufferReceived = Buffer.from(headerSecret);
        if (bufferExpected.length !== bufferReceived.length || !crypto.timingSafeEqual(bufferExpected, bufferReceived)) {
            throw new Error();
        }
        next();
    } catch {
        res.status(401).json({ error: 'Access denied: invalid secret' });
    }
};

const TicketSchema = z.object({
    ticketId: z.string().min(1, "ID ticket required"),
    employeeId: z.string().min(1),
    trainingName: z.string().min(1),
    requestedAt: z.string().optional(),
});
type ServiceNowTicketPayload = z.infer<typeof TicketSchema>;

type Decision = 'APPROVED' | 'REJECTED';

interface SailPointIdentity {
    name: string;
    department: string;
    isActive: boolean;
    completedTrainings: string[];
}

const sailpointDB = new Map<string, SailPointIdentity>([
    ["USR_789", { name: "Alice Dupont", department: "R&D", isActive: true, completedTrainings: ["Biosafety Level 2", "ISO 13485"] }],
    ["USR_404", { name: "Bob Martin", department: "Logistics", isActive: false, completedTrainings: [] }]
]);

function getIdentity(employeeId: string): SailPointIdentity | undefined {
    return sailpointDB.get(employeeId);
}

const escapeXml = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'OK', service: 'ITSM-Integration-PoC' });
});

app.get('/api/sailpoint/:employeeId', (req: Request, res: Response) => {
    const user = getIdentity(req.params.employeeId);
    if (user) {
        res.status(200).json(user);
    } else {
        res.status(404).json({ error: "Employee not found in SailPoint" });
    }
});

app.post('/api/webhook/servicenow', verifyWebhookSecret, (req: Request, res: Response) => {
    try {
        const ticket = TicketSchema.parse(req.body);
        
        console.log(`\n[SERVICENOW WEBHOOK] New ticket received: ${ticket.ticketId}`);
        console.log(` -> Employee: ${ticket.employeeId} | Training: ${ticket.trainingName}`);
        
        const identity = getIdentity(ticket.employeeId);
        
        let finalDecision: Decision = 'REJECTED';
        let reason = '';

        if (!identity) {
            reason = "User not found in Identity System";
            console.log("Automated decision: Rejected (User not found)");
        } else if (!identity.isActive) {
            reason = "Account is inactive";
            console.log("Automated decision: Rejected (Account is inactive)")
        } else {
            finalDecision = 'APPROVED';
            reason = "Active account and training verified";
            console.log("Automated decision: Approved.");
        }

        const teamsPayload = {
            "@type": "MessageCard",
            "@context": "http://schema.org/extensions",
            "themeColor": finalDecision === "APPROVED" ? "00FF00" : "FF0000",
            "summary": "ServiceNow notification",
            "sections": [{
                "activityTitle": `Ticket update ${ticket.ticketId}`,
                "text": `Automated decision : **${finalDecision}** for employee ${identity ? identity.name : ticket.employeeId} (${reason})`
            }]
        };
        console.log("[MICROSOFT TEAMS] Payload ready for Graph API:\n", JSON.stringify(teamsPayload, null, 2));

        const soapXML = `
            <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
            <soapenv:Body>
            <TicketResponse>
            <TicketId>${escapeXml(ticket.ticketId)}</TicketId>
            <Decision>${finalDecision}</Decision>
            <Reason>${escapeXml(reason)}</Reason>
            </TicketResponse>
            </soapenv:Body>
            </soapenv:Envelope>
            `;
        res.set('Content-Type', 'text/xml');
        res.status(200).send(soapXML.trim());

    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: "Invalid payload format", details: error.issues });
            return;
        }
        console.error("Internal error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

app.listen(PORT, () => {
    console.log(`ITSM PoC Server started at http://localhost:${PORT}`);
});