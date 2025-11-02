"use client";

import { useState, useEffect } from "react";
import { AmdStrategy, AmdResult, CallStatus } from "@prisma/client";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Call {
  id: string;
  targetNumber: string;
  amdStrategy: AmdStrategy;
  status: CallStatus;
  amdResult?: AmdResult;
  confidence?: number;
  duration?: number;
  cost?: number;
  createdAt: string;
}

export function CallHistory() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<{
    strategy?: AmdStrategy;
    status?: CallStatus;
    amdResult?: AmdResult;
  }>({});

  useEffect(() => {
    fetchCalls();
  }, [filter]);

  const fetchCalls = async () => {
    try {
      const params = new URLSearchParams();
      if (filter.strategy) params.append("strategy", filter.strategy);
      if (filter.status) params.append("status", filter.status);
      if (filter.amdResult) params.append("amdResult", filter.amdResult);

      const response = await fetch(`/api/calls?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch calls");
      
      const data = await response.json();
      setCalls(data.calls);
    } catch (error) {
      console.error("Error fetching calls:", error);
    } finally {
      setLoading(false);
    }
  };

  const exportToCsv = () => {
    const headers = [
      "Date",
      "Phone Number",
      "AMD Strategy",
      "Status",
      "AMD Result",
      "Confidence",
      "Duration (s)",
      "Cost ($)",
    ];

    const csvData = calls.map(call => [
      new Date(call.createdAt).toLocaleString(),
      call.targetNumber,
      call.amdStrategy.replace("_", " "),
      call.status.replace("_", " "),
      call.amdResult?.replace("_", " ") || "N/A",
      call.confidence ? `${(call.confidence * 100).toFixed(1)}%` : "N/A",
      call.duration || "N/A",
      call.cost ? `$${call.cost.toFixed(4)}` : "N/A",
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `call-history-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusVariant = (status: CallStatus) => {
    switch (status) {
      case CallStatus.COMPLETED:
      case CallStatus.ANSWERED:
        return "success";
      case CallStatus.FAILED:
        return "destructive";
      case CallStatus.CANCELLED:
        return "secondary";
      case CallStatus.INITIATED:
      case CallStatus.RINGING:
        return "default";
      default:
        return "secondary";
    }
  };

  const getAmdResultVariant = (result?: AmdResult) => {
    if (!result) return "secondary";
    
    switch (result) {
      case AmdResult.HUMAN:
        return "success";
      case AmdResult.MACHINE:
      case AmdResult.VOICEMAIL:
        return "warning";
      case AmdResult.ERROR:
        return "destructive";
      case AmdResult.UNDECIDED:
      case AmdResult.TIMEOUT:
        return "secondary";
      default:
        return "secondary";
    }
  };

  if (loading) {
    return (
      <div className="w-full mx-auto">
        <Card>
          <CardContent className="flex justify-center items-center h-64">
            <div className="flex items-center space-x-3">
              <Spinner size="md" />
              <span className="text-lg text-gray-600">Loading call history...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full mx-auto">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Call History</h2>
                <p className="text-sm text-gray-600">View and analyze your call records</p>
              </div>
            </div>
            <Button
              onClick={exportToCsv}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Export CSV</span>
            </Button>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium text-gray-700">AMD Strategy</label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    {filter.strategy 
                      ? filter.strategy === AmdStrategy.TWILIO_NATIVE ? "Twilio Native"
                        : filter.strategy === AmdStrategy.JAMBONZ_SIP ? "Jambonz SIP"
                        : filter.strategy === AmdStrategy.HUGGINGFACE_MODEL ? "HuggingFace Model"
                        : filter.strategy === AmdStrategy.GEMINI_FLASH ? "Gemini Flash"
                        : "All Strategies"
                      : "All Strategies"
                    }
                    <svg className="h-4 w-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-full">
                  <DropdownMenuItem onClick={() => setFilter({ ...filter, strategy: undefined })}>
                    All Strategies
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilter({ ...filter, strategy: AmdStrategy.TWILIO_NATIVE })}>
                    Twilio Native
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilter({ ...filter, strategy: AmdStrategy.JAMBONZ_SIP })}>
                    Jambonz SIP
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilter({ ...filter, strategy: AmdStrategy.HUGGINGFACE_MODEL })}>
                    HuggingFace Model
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilter({ ...filter, strategy: AmdStrategy.GEMINI_FLASH })}>
                    Gemini Flash
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium text-gray-700">Status</label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    {filter.status 
                      ? filter.status === CallStatus.COMPLETED ? "Completed"
                        : filter.status === CallStatus.FAILED ? "Failed"
                        : filter.status === CallStatus.CANCELLED ? "Cancelled"
                        : "All Statuses"
                      : "All Statuses"
                    }
                    <svg className="h-4 w-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-full">
                  <DropdownMenuItem onClick={() => setFilter({ ...filter, status: undefined })}>
                    All Statuses
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilter({ ...filter, status: CallStatus.COMPLETED })}>
                    Completed
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilter({ ...filter, status: CallStatus.FAILED })}>
                    Failed
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilter({ ...filter, status: CallStatus.CANCELLED })}>
                    Cancelled
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium text-gray-700">AMD Result</label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    {filter.amdResult 
                      ? filter.amdResult === AmdResult.HUMAN ? "Human"
                        : filter.amdResult === AmdResult.MACHINE ? "Machine"
                        : filter.amdResult === AmdResult.VOICEMAIL ? "Voicemail"
                        : filter.amdResult === AmdResult.UNDECIDED ? "Undecided"
                        : "All Results"
                      : "All Results"
                    }
                    <svg className="h-4 w-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-full">
                  <DropdownMenuItem onClick={() => setFilter({ ...filter, amdResult: undefined })}>
                    All Results
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilter({ ...filter, amdResult: AmdResult.HUMAN })}>
                    Human
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilter({ ...filter, amdResult: AmdResult.MACHINE })}>
                    Machine
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilter({ ...filter, amdResult: AmdResult.VOICEMAIL })}>
                    Voicemail
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilter({ ...filter, amdResult: AmdResult.UNDECIDED })}>
                    Undecided
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phone Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    AMD Strategy
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    AMD Result
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Confidence
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cost
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {calls.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center space-y-3">
                        <svg className="h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        <div className="text-center">
                          <p className="text-lg font-medium text-gray-900">No calls found</p>
                          <p className="text-sm text-gray-500">Start by making your first call!</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  calls.map((call) => (
                    <tr key={call.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(call.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {call.targetNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {call.amdStrategy.replace("_", " ")}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={getStatusVariant(call.status)}>
                          {call.status.replace("_", " ")}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {call.amdResult ? (
                          <Badge variant={getAmdResultVariant(call.amdResult)}>
                            {call.amdResult.replace("_", " ")}
                          </Badge>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {call.confidence ? (
                          <div className="flex items-center space-x-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full" 
                                style={{ width: `${call.confidence * 100}%` }}
                              ></div>
                            </div>
                            <span className="text-xs">{(call.confidence * 100).toFixed(1)}%</span>
                          </div>
                        ) : (
                          "N/A"
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {call.duration ? `${call.duration}s` : "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {call.cost ? `$${call.cost.toFixed(4)}` : "N/A"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
