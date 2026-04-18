'use client';

import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import VoiceChat from '@/components/VoiceChat';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-yellow-600 to-blue-800">
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">VibeCall</h1>
          <p className="text-gray-300">Voice-only random chat</p>
        </div>
        <VoiceChat />
      </div>
    </div>
  );
}
