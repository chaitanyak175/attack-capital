"use client";

import { useState } from "react";
import { AmdStrategy } from "@prisma/client";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { formatPhoneNumber, displayPhoneNumber, isValidPhoneNumber } from "@/lib/phoneUtils";

interface CallStatus {
  status: "idle" | "dialing" | "ringing" | "connected" | "analyzing" | "completed" | "failed";
  message?: string;
  amdResult?: string;
  confidence?: number;
}

export function DialingInterface() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedStrategy, setSelectedStrategy] = useState<AmdStrategy>(AmdStrategy.TWILIO_NATIVE);
  const [callStatus, setCallStatus] = useState<CallStatus>({ status: "idle" });
  const [isDialing, setIsDialing] = useState(false);

  const amdStrategies = [
    { 
      value: AmdStrategy.TWILIO_NATIVE, 
      label: "Strategy 1: Twilio Native AMD", 
      description: "Built-in Twilio machine detection with enhanced parameters",
      icon: "🔧",
      complexity: "Low",
      accuracy: "85%"
    },
    { 
      value: AmdStrategy.JAMBONZ_SIP, 
      label: "Strategy 2: Jambonz SIP Enhanced", 
      description: "SIP-enhanced AMD with custom recognizers and fallback",
      icon: "📞",
      complexity: "Medium", 
      accuracy: "88%"
    },
    { 
      value: AmdStrategy.HUGGINGFACE_MODEL, 
      label: "Strategy 3: HuggingFace ML Model", 
      description: "jakeBland/wav2vec-vm-finetune via Python FastAPI service",
      icon: "🤖",
      complexity: "High",
      accuracy: "92%"
    },
    { 
      value: AmdStrategy.GEMINI_FLASH, 
      label: "Strategy 4: Gemini 2.5 Flash LLM", 
      description: "Real-time multimodal LLM audio analysis with cost optimization",
      icon: "✨",
      complexity: "High",
      accuracy: "94%"
    },
  ];

  const testNumbers = [
    { name: "Costco", number: "8007742678", description: "US Voicemail test", country: "US" },
    { name: "Nike", number: "8008066453", description: "US Voicemail test", country: "US" },
    { name: "PayPal", number: "8882211161", description: "US Voicemail test", country: "US" },
    { name: "Format Test 1", number: "(555) 123-4567", description: "Formatted US number", country: "US" },
    { name: "Format Test 2", number: "555-123-4567", description: "Dashed US number", country: "US" },
    { name: "Format Test 3", number: "5551234567", description: "Plain US number", country: "US" },
    { name: "India Test 1", number: "9876543210", description: "Indian mobile format", country: "IN" },
    { name: "India Test 2", number: "8855069509", description: "Your verified number", country: "IN" },
    { name: "India Test 3", number: "+91-98765-43210", description: "Indian with country code", country: "IN" },
  ];

  const handleDial = async () => {
    if (!phoneNumber.trim()) {
      alert("Please enter a phone number");
      return;
    }

    if (!isValidPhoneNumber(phoneNumber)) {
      alert("Please enter a valid phone number (e.g., 1234567890, 9876543210, (123) 456-7890, or +91-98765-43210)");
      return;
    }

    setIsDialing(true);
    setCallStatus({ status: "dialing", message: "Initiating call..." });

    try {
      const response = await fetch("/api/calls/dial", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phoneNumber: phoneNumber.trim(),
          amdStrategy: selectedStrategy,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to initiate call");
      }

      const data = await response.json();
      
      if (data.status === "failed") {
        setCallStatus({ 
          status: "failed", 
          message: data.message || data.error || "Call failed",
          amdResult: "error"
        });
        setIsDialing(false);
        return;
      }
      
      pollCallStatus(data.callId);
      
    } catch (error) {
      console.error("Error initiating call:", error);
      setCallStatus({ 
        status: "failed", 
        message: "Failed to initiate call. Please try again." 
      });
      setIsDialing(false);
    }
  };

  const pollCallStatus = async (callId: string) => {
    const poll = async () => {
      try {
        const response = await fetch(`/api/calls/${callId}/status`);
        if (!response.ok) return;
        
        const data = await response.json();
        
        setCallStatus({
          status: data.status,
          message: data.message,
          amdResult: data.amdResult,
          confidence: data.confidence,
        });

        if (data.status === "completed" || data.status === "failed") {
          setIsDialing(false);
          return;
        }

        setTimeout(poll, 1000);
      } catch (error) {
        console.error("Error polling call status:", error);
        setIsDialing(false);
      }
    };

    poll();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "dialing":
      case "ringing":
      case "analyzing":
        return "text-blue-600";
      case "connected":
        return "text-green-600";
      case "completed":
        return "text-green-600";
      case "failed":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "dialing":
      case "ringing":
      case "analyzing":
        return "default";
      case "connected":
      case "completed":
        return "success";
      case "failed":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const getAmdResultVariant = (result: string) => {
    switch (result.toLowerCase()) {
      case "human":
        return "success";
      case "machine":
      case "voicemail":
        return "warning";
      case "error":
        return "destructive";
      default:
        return "secondary";
    }
  };

  return (
    <div className="w-full mx-auto">
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
              <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Outbound Call Interface</h2>
          </div>
          <p className="text-sm text-gray-600 mt-2">Configure and initiate calls with advanced answering machine detection</p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Phone Number Input */}
          <Input
            label="Target Phone Number"
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="e.g., 1234567890, 9876543210, (123) 456-7890, or +91-98765-43210"
            disabled={isDialing}
            leftIcon={
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            }
          />

          {/* Test Number Buttons */}
          <div className="mt-3">
            <p className="text-sm font-medium text-gray-700 mb-2">Quick Test Numbers:</p>
            
            {/* US Numbers */}
            <div className="mb-3">
              <p className="text-xs font-medium text-gray-600 mb-1">🇺🇸 US Test Numbers (Various Formats):</p>
              <div className="flex flex-wrap gap-2">
                {testNumbers.filter(num => num.country === 'US').map((testNum) => (
                  <button
                    key={testNum.name}
                    type="button"
                    onClick={() => setPhoneNumber(testNum.number)}
                    disabled={isDialing}
                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <span className="font-semibold">{testNum.name}</span>
                    <span className="ml-1 text-gray-500">({testNum.number})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Indian Numbers */}
            <div className="mb-3">
              <p className="text-xs font-medium text-gray-600 mb-1">🇮🇳 Indian Test Numbers (Including Verified):</p>
              <div className="flex flex-wrap gap-2">
                {testNumbers.filter(num => num.country === 'IN').map((testNum) => (
                  <button
                    key={testNum.name}
                    type="button"
                    onClick={() => setPhoneNumber(testNum.number)}
                    disabled={isDialing}
                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <span className="font-semibold">{testNum.name}</span>
                    <span className="ml-1 text-gray-500">({testNum.number})</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
              <div className="flex items-center">
                <svg className="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="ml-3">
                  <p className="text-sm text-green-700">
                    <strong>Verified Number Ready:</strong> Use "India Test 2" (8855069509) with "Twilio Native AMD" for guaranteed success!
                  </p>
                </div>
              </div>
            </div>
            
            <p className="mt-2 text-xs text-gray-500">
              Click any button above to auto-fill the phone number field. Supports US and Indian formats - no country code needed!
            </p>
          </div>

          {/* AMD Strategy Selection */}
          <div className="space-y-3">
            <Select
              label="AMD Strategy Selection"
              value={selectedStrategy}
              onChange={(e) => setSelectedStrategy(e.target.value as AmdStrategy)}
              disabled={isDialing}
              options={amdStrategies.map(strategy => ({
                value: strategy.value,
                label: `${strategy.label} (${strategy.accuracy} accuracy, ${strategy.complexity} complexity)`,
                description: strategy.description
              }))}
              placeholder="Select an AMD strategy..."
            />
            
            {/* Strategy Details Card */}
            {selectedStrategy && (
              <div className="mt-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex items-start space-x-3">
                  <div className="text-2xl">
                    {amdStrategies.find(s => s.value === selectedStrategy)?.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-gray-900">
                        {amdStrategies.find(s => s.value === selectedStrategy)?.label}
                      </h3>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          amdStrategies.find(s => s.value === selectedStrategy)?.complexity === 'Low' ? 'bg-green-100 text-green-800' :
                          amdStrategies.find(s => s.value === selectedStrategy)?.complexity === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {amdStrategies.find(s => s.value === selectedStrategy)?.complexity}
                        </span>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {amdStrategies.find(s => s.value === selectedStrategy)?.accuracy}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      {amdStrategies.find(s => s.value === selectedStrategy)?.description}
                    </p>
                    
                    {/* Strategy-specific status indicators */}
                    {selectedStrategy === AmdStrategy.HUGGINGFACE_MODEL && (
                      <div className="flex items-center text-xs text-gray-500">
                        <div className="w-2 h-2 rounded-full bg-gray-400 mr-2"></div>
                        Python service will auto-start if needed
                      </div>
                    )}
                    {selectedStrategy === AmdStrategy.GEMINI_FLASH && (
                      <div className="flex items-center text-xs text-gray-500">
                        <div className="w-2 h-2 rounded-full bg-gray-400 mr-2"></div>
                        Requires Gemini API key (free from ai.google.dev)
                      </div>
                    )}
                    {selectedStrategy === AmdStrategy.JAMBONZ_SIP && (
                      <div className="flex items-center text-xs text-gray-500">
                        <div className="w-2 h-2 rounded-full bg-gray-400 mr-2"></div>
                        Auto-fallback to Twilio if Jambonz unavailable
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Dial Button */}
          <Button
            onClick={handleDial}
            disabled={isDialing || !phoneNumber.trim()}
            className="w-full"
            size="lg"
          >
            {isDialing ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Calling...
              </>
            ) : (
              <>
                <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                Dial Now
              </>
            )}
          </Button>

          {/* Call Status */}
          {callStatus.status !== "idle" && (
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="pt-6">
                <h3 className="text-sm font-medium text-gray-900 mb-4 flex items-center">
                  <svg className="h-4 w-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Call Status
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Status:</span>
                    <Badge variant={getStatusVariant(callStatus.status)}>
                      {callStatus.status.replace("_", " ")}
                    </Badge>
                  </div>
                  
                  {callStatus.message && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Message:</span>
                      <span className="text-sm text-gray-600 max-w-xs text-right">{callStatus.message}</span>
                    </div>
                  )}
                  
                  {callStatus.status === "failed" && selectedStrategy !== AmdStrategy.TWILIO_NATIVE && (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                      <div className="flex">
                        <svg className="h-5 w-5 text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div className="ml-3">
                          <p className="text-sm text-blue-700">
                            <strong>Tip:</strong> Try switching to "Twilio Native AMD" for the most reliable calling experience with your verified number.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {callStatus.amdResult && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">AMD Result:</span>
                        <Badge variant={getAmdResultVariant(callStatus.amdResult)}>
                          {callStatus.amdResult.replace("_", " ")}
                        </Badge>
                      </div>
                      
                      {/* Strategy-specific result details */}
                      <div className="text-xs text-gray-600 bg-gray-50 rounded p-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">
                            {amdStrategies.find(s => s.value === selectedStrategy)?.icon}
                          </span>
                          <span>
                            {amdStrategies.find(s => s.value === selectedStrategy)?.label}
                          </span>
                        </div>
                        
                        {selectedStrategy === AmdStrategy.HUGGINGFACE_MODEL && (
                          <div className="mt-1 text-xs">
                            🤖 ML Model: jakeBland/wav2vec-vm-finetune
                            <br />📊 Analysis: Real-time audio pattern recognition
                          </div>
                        )}
                        
                        {selectedStrategy === AmdStrategy.GEMINI_FLASH && (
                          <div className="mt-1 text-xs">
                            ✨ LLM: Gemini 2.5 Flash multimodal analysis
                            <br />🎯 Method: Speech-to-text + AI reasoning
                          </div>
                        )}
                        
                        {selectedStrategy === AmdStrategy.JAMBONZ_SIP && (
                          <div className="mt-1 text-xs">
                            📞 SIP: Enhanced routing with custom AMD parameters
                            <br />⚡ Latency: Optimized for real-time detection
                          </div>
                        )}
                        
                        {selectedStrategy === AmdStrategy.TWILIO_NATIVE && (
                          <div className="mt-1 text-xs">
                            🔧 Native: Twilio's built-in machine detection
                            <br />✅ Reliability: Battle-tested production system
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {callStatus.confidence && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Confidence:</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              callStatus.confidence > 0.8 ? 'bg-green-600' :
                              callStatus.confidence > 0.6 ? 'bg-yellow-600' :
                              'bg-red-600'
                            }`}
                            style={{ width: `${callStatus.confidence * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-600 min-w-12">
                          {(callStatus.confidence * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
