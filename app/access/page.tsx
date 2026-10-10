import type { Metadata } from "next";
import { InvalidCodeNotice } from "./invalid-code-notice";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const metadata: Metadata = { title: "Pilot access — VetTravel Verify" };

export default function AccessPage() {
  return (
    <Card className="mx-auto max-w-md">
      <CardHeader>
        <CardTitle as="h1">Pilot access</CardTitle>
        <CardDescription>VetTravel Verify is in a closed pilot with participating veterinarians. Enter the access code you were given.</CardDescription>
      </CardHeader>
      <CardContent>
        <form method="post" action="/api/access" className="flex flex-col gap-3">
          <InvalidCodeNotice />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="code">Access code</Label>
            <Input id="code" name="code" autoComplete="off" required />
          </div>
          <Button type="submit">Continue</Button>
        </form>
      </CardContent>
    </Card>
  );
}
