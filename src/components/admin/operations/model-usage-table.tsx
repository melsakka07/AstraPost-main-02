"use client";

import { EmptyState } from "@/components/admin/empty-state";
import {
  type ModelConsumption,
  formatUsd,
  providerLabel,
} from "@/components/admin/operations/operations-dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ModelUsageTableProps {
  models: ModelConsumption[];
}

export function ModelUsageTable({ models }: ModelUsageTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Usage by Model</CardTitle>
      </CardHeader>
      <CardContent>
        {models.length === 0 ? (
          <EmptyState
            title="No model usage"
            description="No AI generations have been recorded for the selected period."
            variant="ai"
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Model</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead className="text-end">Calls</TableHead>
                  <TableHead className="text-end">Tokens</TableHead>
                  <TableHead className="text-end">Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {models.map((m) => (
                  <TableRow key={m.model}>
                    <TableCell className="max-w-[14rem] truncate font-medium" title={m.model}>
                      {m.model}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {providerLabel(m.provider)}
                    </TableCell>
                    <TableCell className="text-end tabular-nums">
                      {m.calls.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-end tabular-nums">
                      {m.tokens.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-end tabular-nums">
                      {formatUsd(m.costCents)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
