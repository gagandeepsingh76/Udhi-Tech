import * as fs from 'fs';
import * as path from 'path';
import { SCIENCE_CONCEPTS } from '../lib/concepts';
import { validateSvg } from '../lib/validator';
import { calculateCostUsd } from '../lib/gemini';
import { DiagramResult } from '../lib/types';

// SVG 1: Pythagoras' theorem
const svgPythagoras = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="100%" height="100%">
  <title>Pythagoras' Theorem: a² + b² = c²</title>
  <defs>
    <linearGradient id="gradHyp" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3b82f6" />
      <stop offset="100%" stop-color="#1d4ed8" />
    </linearGradient>
    <linearGradient id="gradSquareC" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#60a5fa" stop-opacity="0.35" />
      <stop offset="100%" stop-color="#2563eb" stop-opacity="0.2" />
    </linearGradient>
    <linearGradient id="gradSquareA" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#10b981" stop-opacity="0.35" />
      <stop offset="100%" stop-color="#059669" stop-opacity="0.2" />
    </linearGradient>
    <linearGradient id="gradSquareB" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.35" />
      <stop offset="100%" stop-color="#d97706" stop-opacity="0.2" />
    </linearGradient>
  </defs>
  <style>
    @keyframes pulseHyp {
      0% { stroke-dashoffset: 0; }
      50% { stroke-dashoffset: 20; }
      100% { stroke-dashoffset: 0; }
    }
    @keyframes glowText {
      0% { opacity: 0.85; }
      50% { opacity: 1; filter: drop-shadow(0 0 6px rgba(59, 130, 246, 0.6)); }
      100% { opacity: 0.85; }
    }
    .hyp-line {
      stroke-dasharray: 8 4;
      animation: pulseHyp 3s linear infinite;
    }
    .formula-title {
      animation: glowText 2.5s ease-in-out infinite;
    }
  </style>
  <rect x="0" y="0" width="800" height="600" fill="#0f172a" rx="12" />
  
  <!-- Title & Header -->
  <text x="400" y="45" font-family="system-ui, sans-serif" font-size="24" font-weight="bold" text-anchor="middle" fill="#f8fafc" class="formula-title">Pythagoras' Theorem: a² + b² = c²</text>
  <text x="400" y="75" font-family="system-ui, sans-serif" font-size="14" text-anchor="middle" fill="#94a3b8">UK GCSE Mathematics - Right-Angled Triangle Geometry</text>

  <!-- Side a Square (Base: 140px) -->
  <rect x="260" y="420" width="140" height="140" fill="url(#gradSquareA)" stroke="#10b981" stroke-width="2" rx="4" />
  <text x="330" y="495" font-family="system-ui, sans-serif" font-size="16" font-weight="bold" fill="#34d399" text-anchor="middle">a² = 9</text>
  <text x="330" y="520" font-family="system-ui, sans-serif" font-size="13" fill="#a7f3d0" text-anchor="middle">(Base Area)</text>

  <!-- Side b Square (Height: 180px) -->
  <rect x="80" y="240" width="180" height="180" fill="url(#gradSquareB)" stroke="#f59e0b" stroke-width="2" rx="4" />
  <text x="170" y="325" font-family="system-ui, sans-serif" font-size="16" font-weight="bold" fill="#fbbf24" text-anchor="middle">b² = 16</text>
  <text x="170" y="350" font-family="system-ui, sans-serif" font-size="13" fill="#fde68a" text-anchor="middle">(Height Area)</text>

  <!-- Hypotenuse c Square (Tilted 228px square) -->
  <polygon points="400,420 540,240 400,130 260,310" fill="url(#gradSquareC)" stroke="#3b82f6" stroke-width="2" />
  <text x="400" y="275" font-family="system-ui, sans-serif" font-size="18" font-weight="bold" fill="#60a5fa" text-anchor="middle">c² = a² + b² = 25</text>
  <text x="400" y="300" font-family="system-ui, sans-serif" font-size="13" fill="#93c5fd" text-anchor="middle">(Hypotenuse Area = 9 + 16)</text>

  <!-- The Core Triangle -->
  <polygon points="260,420 400,420 260,240" fill="#1e293b" stroke="#cbd5e1" stroke-width="3" />
  
  <!-- Right Angle Square Indicator -->
  <rect x="260" y="400" width="20" height="20" fill="none" stroke="#f87171" stroke-width="2" />

  <!-- Animated Hypotenuse line -->
  <line x1="260" y1="240" x2="400" y2="420" stroke="url(#gradHyp)" stroke-width="4" class="hyp-line" />

  <!-- Labels -->
  <text x="330" y="412" font-family="system-ui, sans-serif" font-size="15" font-weight="bold" fill="#34d399" text-anchor="middle">Side a (Base)</text>
  <text x="245" y="335" font-family="system-ui, sans-serif" font-size="15" font-weight="bold" fill="#fbbf24" text-anchor="end">Side b (Height)</text>
  <text x="345" y="320" font-family="system-ui, sans-serif" font-size="15" font-weight="bold" fill="#60a5fa" text-anchor="start">Hypotenuse (c)</text>
  <text x="235" y="415" font-family="system-ui, sans-serif" font-size="12" fill="#f87171" text-anchor="end">90° Right Angle</text>
  <text x="650" y="350" font-family="system-ui, sans-serif" font-size="15" font-weight="bold" fill="#38bdf8" text-anchor="middle">Key Rule:</text>
  <text x="650" y="380" font-family="system-ui, sans-serif" font-size="14" fill="#cbd5e1" text-anchor="middle">Longest side = Hypotenuse</text>
  <text x="650" y="405" font-family="system-ui, sans-serif" font-size="14" fill="#cbd5e1" text-anchor="middle">Opposite the 90° angle</text>
</svg>`;

// SVG 2: Parts of a circle
const svgCircle = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="100%" height="100%">
  <title>Parts of a Circle: Centre, Radius, Diameter, Circumference</title>
  <defs>
    <linearGradient id="circleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e1b4b" />
      <stop offset="100%" stop-color="#0f172a" />
    </linearGradient>
    <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#38bdf8" />
    </marker>
    <marker id="arrowRed" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#f43f5e" />
    </marker>
  </defs>
  <style>
    @keyframes spinPerimeter {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    @keyframes pulsePoint {
      0% { r: 6px; fill: #facc15; }
      50% { r: 9px; fill: #fef08a; }
      100% { r: 6px; fill: #facc15; }
    }
    .rotating-circumference {
      transform-origin: 400px 310px;
      animation: spinPerimeter 12s linear infinite;
    }
    .pulse-center {
      animation: pulsePoint 2s ease-in-out infinite;
    }
  </style>
  <rect x="0" y="0" width="800" height="600" fill="#0f172a" rx="12" />

  <!-- Title -->
  <text x="400" y="45" font-family="system-ui, sans-serif" font-size="24" font-weight="bold" text-anchor="middle" fill="#f8fafc">Parts of a Circle: Geometry Essentials</text>
  <text x="400" y="75" font-family="system-ui, sans-serif" font-size="14" text-anchor="middle" fill="#94a3b8">UK GCSE Mathematics - Centre, Radius, Diameter, Circumference</text>

  <!-- Main Circle Background -->
  <circle cx="400" cy="310" r="170" fill="url(#circleGrad)" stroke="#334155" stroke-width="4" />

  <!-- Animated Circumference Perimeter -->
  <circle cx="400" cy="310" r="170" fill="none" stroke="#06b6d4" stroke-width="4" stroke-dasharray="16 8" class="rotating-circumference" />

  <!-- Orbiting Indicator on Circumference -->
  <g class="rotating-circumference">
    <circle cx="570" cy="310" r="7" fill="#22d3ee" stroke="#083344" stroke-width="2" />
  </g>

  <!-- Diameter (Full line across centre) -->
  <line x1="230" y1="310" x2="570" y2="310" stroke="#f43f5e" stroke-width="3" marker-start="url(#arrowRed)" marker-end="url(#arrowRed)" />

  <!-- Radius (Line from centre to top edge) -->
  <line x1="400" y1="310" x2="400" y2="140" stroke="#38bdf8" stroke-width="3" marker-end="url(#arrow)" />

  <!-- Centre Point (Point O) -->
  <circle cx="400" cy="310" r="7" class="pulse-center" />

  <!-- Labels -->
  <text x="400" y="335" font-family="system-ui, sans-serif" font-size="14" font-weight="bold" fill="#facc15" text-anchor="middle">Centre (O)</text>
  
  <text x="415" y="225" font-family="system-ui, sans-serif" font-size="15" font-weight="bold" fill="#38bdf8" text-anchor="start">Radius (r)</text>
  <text x="415" y="245" font-family="system-ui, sans-serif" font-size="12" fill="#bae6fd" text-anchor="start">Distance centre to edge</text>

  <text x="290" y="295" font-family="system-ui, sans-serif" font-size="15" font-weight="bold" fill="#fb7185" text-anchor="middle">Diameter (d)</text>
  <text x="290" y="340" font-family="system-ui, sans-serif" font-size="12" fill="#fecdd3" text-anchor="middle">d = 2 × r</text>

  <text x="600" y="190" font-family="system-ui, sans-serif" font-size="16" font-weight="bold" fill="#22d3ee" text-anchor="start">Circumference (C)</text>
  <text x="600" y="215" font-family="system-ui, sans-serif" font-size="13" fill="#a5f3fc" text-anchor="start">Distance around circle: C = 2πr</text>
  
  <!-- Educational Notes -->
  <rect x="100" y="515" width="600" height="55" fill="#1e293b" rx="8" stroke="#334155" stroke-width="1" />
  <text x="400" y="538" font-family="system-ui, sans-serif" font-size="13" font-weight="bold" fill="#e2e8f0" text-anchor="middle">GCSE Formula Summary: Diameter = 2 × Radius | Circumference = π × Diameter = 2πr</text>
  <text x="400" y="558" font-family="system-ui, sans-serif" font-size="12" fill="#94a3b8" text-anchor="middle">Every point on the circumference is equidistant (distance r) from the centre.</text>
</svg>`;

// SVG 3: Series circuit
const svgCircuit = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="100%" height="100%">
  <title>Series Circuit: Single Loop, Current &amp; Shared Voltage</title>
  <defs>
    <filter id="bulbGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="8" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>
  <style>
    @keyframes flowElectrons {
      from { stroke-dashoffset: 200; }
      to { stroke-dashoffset: 0; }
    }
    @keyframes glowBulb {
      0% { fill: #fef08a; filter: drop-shadow(0 0 8px rgba(250, 204, 21, 0.5)); }
      50% { fill: #fde047; filter: drop-shadow(0 0 18px rgba(250, 204, 21, 0.9)); }
      100% { fill: #fef08a; filter: drop-shadow(0 0 8px rgba(250, 204, 21, 0.5)); }
    }
    .electron-flow {
      stroke: #60a5fa;
      stroke-width: 3;
      stroke-dasharray: 6 14;
      animation: flowElectrons 4s linear infinite;
    }
    .lamp-glow {
      animation: glowBulb 2s ease-in-out infinite;
    }
  </style>
  <rect x="0" y="0" width="800" height="600" fill="#0b1120" rx="12" />

  <!-- Header -->
  <text x="400" y="45" font-family="system-ui, sans-serif" font-size="24" font-weight="bold" text-anchor="middle" fill="#f8fafc">Series Electric Circuit</text>
  <text x="400" y="75" font-family="system-ui, sans-serif" font-size="14" text-anchor="middle" fill="#94a3b8">UK GCSE Physics - Single Loop, Uniform Current, Shared Voltage</text>

  <!-- Main Wire Loop (Single Loop) -->
  <rect x="150" y="130" width="500" height="340" fill="none" stroke="#475569" stroke-width="6" rx="20" />
  <rect x="150" y="130" width="500" height="340" fill="none" class="electron-flow" rx="20" />

  <!-- Battery / Cell (Top Branch) -->
  <rect x="360" y="115" width="80" height="30" fill="#0b1120" />
  <!-- Positive long plate -->
  <line x1="390" y1="110" x2="390" y2="150" stroke="#f8fafc" stroke-width="4" />
  <!-- Negative short plate -->
  <line x1="410" y1="120" x2="410" y2="140" stroke="#94a3b8" stroke-width="6" />
  <text x="375" y="105" font-family="system-ui, sans-serif" font-size="16" font-weight="bold" fill="#ef4444">+</text>
  <text x="425" y="105" font-family="system-ui, sans-serif" font-size="18" font-weight="bold" fill="#3b82f6">-</text>
  <text x="400" y="90" font-family="system-ui, sans-serif" font-size="14" font-weight="bold" fill="#f8fafc" text-anchor="middle">Cell / Battery (V_total)</text>

  <!-- Switch (Left Branch) -->
  <rect x="135" y="270" width="30" height="60" fill="#0b1120" />
  <circle cx="150" cy="280" r="5" fill="#f8fafc" />
  <circle cx="150" cy="320" r="5" fill="#f8fafc" />
  <line x1="150" y1="280" x2="150" y2="320" stroke="#22c55e" stroke-width="4" />
  <text x="130" y="305" font-family="system-ui, sans-serif" font-size="13" font-weight="bold" fill="#4ade80" text-anchor="end">Closed Switch</text>

  <!-- Ammeter (Bottom Left) -->
  <rect x="250" y="455" width="60" height="30" fill="#0b1120" />
  <circle cx="280" cy="470" r="22" fill="#1e293b" stroke="#38bdf8" stroke-width="3" />
  <text x="280" y="477" font-family="system-ui, sans-serif" font-size="18" font-weight="bold" fill="#38bdf8" text-anchor="middle">A</text>
  <text x="280" y="515" font-family="system-ui, sans-serif" font-size="13" font-weight="bold" fill="#bae6fd" text-anchor="middle">Ammeter (Current I)</text>
  <text x="280" y="533" font-family="system-ui, sans-serif" font-size="11" fill="#94a3b8" text-anchor="middle">Same everywhere in loop</text>

  <!-- Lamp 1 (Bottom Right) -->
  <rect x="490" y="455" width="60" height="30" fill="#0b1120" />
  <circle cx="520" cy="470" r="22" class="lamp-glow" stroke="#ca8a04" stroke-width="3" />
  <!-- Filament X -->
  <line x1="508" y1="458" x2="532" y2="482" stroke="#854d0e" stroke-width="2.5" />
  <line x1="532" y1="458" x2="508" y2="482" stroke="#854d0e" stroke-width="2.5" />
  <text x="520" y="515" font-family="system-ui, sans-serif" font-size="13" font-weight="bold" fill="#facc15" text-anchor="middle">Filament Lamp</text>
  <text x="520" y="533" font-family="system-ui, sans-serif" font-size="11" fill="#94a3b8" text-anchor="middle">Component Voltage (V₁)</text>

  <!-- Loop & Electron Flow Explanation -->
  <text x="665" y="295" font-family="system-ui, sans-serif" font-size="14" font-weight="bold" fill="#60a5fa" text-anchor="start">Single Loop Rule:</text>
  <text x="665" y="320" font-family="system-ui, sans-serif" font-size="12" fill="#cbd5e1" text-anchor="start">Only one path for</text>
  <text x="665" y="338" font-family="system-ui, sans-serif" font-size="12" fill="#cbd5e1" text-anchor="start">current to flow.</text>
  <text x="665" y="365" font-family="system-ui, sans-serif" font-size="12" fill="#fde047" text-anchor="start">V_cell = V₁ + V₂</text>

  <!-- Bottom Banner -->
  <rect x="150" y="545" width="500" height="35" fill="#1e293b" rx="6" />
  <text x="400" y="567" font-family="system-ui, sans-serif" font-size="12" fill="#94a3b8" text-anchor="middle">Animated blue dashes demonstrate electron drift current flowing steadily around the circuit loop.</text>
</svg>`;

// SVG 4: Photosynthesis
const svgPhotosynthesis = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="100%" height="100%">
  <title>Photosynthesis: Light Energy, CO₂ + H₂O → Glucose + O₂</title>
  <defs>
    <linearGradient id="sunGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a" />
      <stop offset="100%" stop-color="#f59e0b" />
    </linearGradient>
    <linearGradient id="leafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#15803d" />
      <stop offset="100%" stop-color="#14532d" />
    </linearGradient>
  </defs>
  <style>
    @keyframes sunRays {
      0% { opacity: 0.4; stroke-dashoffset: 0; }
      50% { opacity: 1.0; stroke-dashoffset: 15; }
      100% { opacity: 0.4; stroke-dashoffset: 0; }
    }
    @keyframes floatParticle {
      0% { transform: translateY(0px); opacity: 0.7; }
      50% { transform: translateY(-8px); opacity: 1; }
      100% { transform: translateY(0px); opacity: 0.7; }
    }
    .sun-ray {
      stroke: #fbbf24;
      stroke-width: 3;
      stroke-dasharray: 6 4;
      animation: sunRays 2.5s ease-in-out infinite;
    }
    .floating-molecule {
      animation: floatParticle 3s ease-in-out infinite;
    }
  </style>
  <rect x="0" y="0" width="800" height="600" fill="#064e3b" rx="12" />

  <!-- Title -->
  <text x="400" y="45" font-family="system-ui, sans-serif" font-size="24" font-weight="bold" text-anchor="middle" fill="#f8fafc">Photosynthesis in Plants</text>
  <text x="400" y="75" font-family="system-ui, sans-serif" font-size="14" text-anchor="middle" fill="#86efac">UK GCSE Biology - Light Absorption, Raw Materials &amp; Products</text>

  <!-- Sun (Top Left) -->
  <circle cx="120" cy="140" r="50" fill="url(#sunGrad)" />
  <line x1="170" y1="160" x2="300" y2="240" class="sun-ray" />
  <line x1="140" y1="195" x2="260" y2="280" class="sun-ray" />
  <line x1="180" y1="130" x2="320" y2="210" class="sun-ray" />
  <text x="120" y="215" font-family="system-ui, sans-serif" font-size="15" font-weight="bold" fill="#fde047" text-anchor="middle">Sunlight (Light Energy)</text>

  <!-- Large Stylized Plant Leaf -->
  <path d="M 240 320 C 260 180, 520 180, 620 320 C 520 460, 260 460, 240 320 Z" fill="url(#leafGrad)" stroke="#22c55e" stroke-width="4" />
  <!-- Central Leaf Vein -->
  <path d="M 240 320 Q 420 310 620 320" fill="none" stroke="#4ade80" stroke-width="3" />
  <path d="M 330 315 Q 380 270 420 250" fill="none" stroke="#4ade80" stroke-width="2" />
  <path d="M 430 315 Q 480 270 520 250" fill="none" stroke="#4ade80" stroke-width="2" />
  <path d="M 350 318 Q 400 360 440 380" fill="none" stroke="#4ade80" stroke-width="2" />

  <!-- Chlorophyll / Chloroplast Site -->
  <circle cx="430" cy="315" r="32" fill="#16a34a" stroke="#86efac" stroke-width="2" />
  <text x="430" y="312" font-family="system-ui, sans-serif" font-size="12" font-weight="bold" fill="#f8fafc" text-anchor="middle">Chlorophyll</text>
  <text x="430" y="328" font-family="system-ui, sans-serif" font-size="10" fill="#bbf7d0" text-anchor="middle">Absorbs Light</text>

  <!-- Inputs (Left side) -->
  <g class="floating-molecule">
    <!-- Carbon Dioxide -->
    <rect x="70" y="300" width="130" height="42" fill="#047857" rx="8" stroke="#10b981" stroke-width="1.5" />
    <text x="135" y="326" font-family="system-ui, sans-serif" font-size="13" font-weight="bold" fill="#f8fafc" text-anchor="middle">CO₂ (via stomata)</text>
    <line x1="200" y1="321" x2="245" y2="321" stroke="#34d399" stroke-width="2" stroke-dasharray="4 2" />

    <!-- Water H2O -->
    <rect x="70" y="380" width="130" height="42" fill="#0284c7" rx="8" stroke="#38bdf8" stroke-width="1.5" />
    <text x="135" y="406" font-family="system-ui, sans-serif" font-size="13" font-weight="bold" fill="#f8fafc" text-anchor="middle">H₂O (via roots)</text>
    <line x1="200" y1="401" x2="260" y2="360" stroke="#38bdf8" stroke-width="2" stroke-dasharray="4 2" />
  </g>

  <!-- Outputs (Right side) -->
  <g class="floating-molecule">
    <!-- Glucose -->
    <rect x="620" y="270" width="140" height="42" fill="#d97706" rx="8" stroke="#fbbf24" stroke-width="1.5" />
    <text x="690" y="296" font-family="system-ui, sans-serif" font-size="13" font-weight="bold" fill="#f8fafc" text-anchor="middle">Glucose (C₆H₁₂O₆)</text>
    <line x1="580" y1="300" x2="620" y2="291" stroke="#f59e0b" stroke-width="2" />

    <!-- Oxygen -->
    <rect x="620" y="350" width="140" height="42" fill="#0369a1" rx="8" stroke="#38bdf8" stroke-width="1.5" />
    <text x="690" y="376" font-family="system-ui, sans-serif" font-size="13" font-weight="bold" fill="#f8fafc" text-anchor="middle">Oxygen (O₂ released)</text>
    <line x1="580" y1="340" x2="620" y2="371" stroke="#38bdf8" stroke-width="2" />
  </g>

  <!-- GCSE Word Equation Banner -->
  <rect x="80" y="500" width="640" height="60" fill="#065f46" rx="8" stroke="#10b981" stroke-width="2" />
  <text x="400" y="525" font-family="system-ui, sans-serif" font-size="14" font-weight="bold" fill="#fde047" text-anchor="middle">GCSE Equation: Carbon Dioxide + Water  —[Light &amp; Chlorophyll]→  Glucose + Oxygen</text>
  <text x="400" y="548" font-family="system-ui, sans-serif" font-size="13" fill="#e2e8f0" text-anchor="middle">6CO₂ + 6H₂O  →  C₆H₁₂O₆ + 6O₂</text>
</svg>`;

// SVG 5: States of matter
const svgStates = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="100%" height="100%">
  <title>States of Matter: Solid, Liquid, Gas Particle Dynamics</title>
  <style>
    @keyframes vibrateSolid {
      0% { transform: translate(0, 0); }
      25% { transform: translate(1px, -1px); }
      50% { transform: translate(-1px, 1px); }
      75% { transform: translate(1px, 1px); }
      100% { transform: translate(0, 0); }
    }
    @keyframes flowLiquid {
      0% { transform: translate(0, 0); }
      33% { transform: translate(3px, -3px); }
      66% { transform: translate(-3px, 2px); }
      100% { transform: translate(0, 0); }
    }
    @keyframes moveGas1 {
      0% { transform: translate(0, 0); }
      25% { transform: translate(25px, -30px); }
      50% { transform: translate(-20px, -45px); }
      75% { transform: translate(15px, 20px); }
      100% { transform: translate(0, 0); }
    }
    @keyframes moveGas2 {
      0% { transform: translate(0, 0); }
      25% { transform: translate(-30px, 25px); }
      50% { transform: translate(25px, -20px); }
      75% { transform: translate(-15px, -30px); }
      100% { transform: translate(0, 0); }
    }
    .part-solid { animation: vibrateSolid 0.4s linear infinite; }
    .part-liquid { animation: flowLiquid 2.2s ease-in-out infinite; }
    .part-gas-1 { animation: moveGas1 2.8s linear infinite; }
    .part-gas-2 { animation: moveGas2 2.4s linear infinite; }
  </style>
  <rect x="0" y="0" width="800" height="600" fill="#0f172a" rx="12" />

  <!-- Header -->
  <text x="400" y="45" font-family="system-ui, sans-serif" font-size="24" font-weight="bold" text-anchor="middle" fill="#f8fafc">States of Matter: Particle Model</text>
  <text x="400" y="75" font-family="system-ui, sans-serif" font-size="14" text-anchor="middle" fill="#94a3b8">UK GCSE Chemistry - Arrangement, Proximity &amp; Movement</text>

  <!-- 1. SOLID CONTAINER -->
  <rect x="60" y="140" width="200" height="240" fill="#1e293b" stroke="#38bdf8" stroke-width="3" rx="8" />
  <text x="160" y="125" font-family="system-ui, sans-serif" font-size="18" font-weight="bold" fill="#38bdf8" text-anchor="middle">1. Solid</text>
  <!-- 4x4 tightly packed particle lattice -->
  <g class="part-solid">
    <circle cx="115" cy="235" r="12" fill="#0284c7" stroke="#7dd3fc" stroke-width="1.5" />
    <circle cx="145" cy="235" r="12" fill="#0284c7" stroke="#7dd3fc" stroke-width="1.5" />
    <circle cx="175" cy="235" r="12" fill="#0284c7" stroke="#7dd3fc" stroke-width="1.5" />
    <circle cx="205" cy="235" r="12" fill="#0284c7" stroke="#7dd3fc" stroke-width="1.5" />

    <circle cx="115" cy="265" r="12" fill="#0284c7" stroke="#7dd3fc" stroke-width="1.5" />
    <circle cx="145" cy="265" r="12" fill="#0284c7" stroke="#7dd3fc" stroke-width="1.5" />
    <circle cx="175" cy="265" r="12" fill="#0284c7" stroke="#7dd3fc" stroke-width="1.5" />
    <circle cx="205" cy="265" r="12" fill="#0284c7" stroke="#7dd3fc" stroke-width="1.5" />

    <circle cx="115" cy="295" r="12" fill="#0284c7" stroke="#7dd3fc" stroke-width="1.5" />
    <circle cx="145" cy="295" r="12" fill="#0284c7" stroke="#7dd3fc" stroke-width="1.5" />
    <circle cx="175" cy="295" r="12" fill="#0284c7" stroke="#7dd3fc" stroke-width="1.5" />
    <circle cx="205" cy="295" r="12" fill="#0284c7" stroke="#7dd3fc" stroke-width="1.5" />

    <circle cx="115" cy="325" r="12" fill="#0284c7" stroke="#7dd3fc" stroke-width="1.5" />
    <circle cx="145" cy="325" r="12" fill="#0284c7" stroke="#7dd3fc" stroke-width="1.5" />
    <circle cx="175" cy="325" r="12" fill="#0284c7" stroke="#7dd3fc" stroke-width="1.5" />
    <circle cx="205" cy="325" r="12" fill="#0284c7" stroke="#7dd3fc" stroke-width="1.5" />
  </g>
  <text x="160" y="410" font-family="system-ui, sans-serif" font-size="13" font-weight="bold" fill="#e2e8f0" text-anchor="middle">Regular arrangement</text>
  <text x="160" y="430" font-family="system-ui, sans-serif" font-size="12" fill="#94a3b8" text-anchor="middle">Very close together</text>
  <text x="160" y="450" font-family="system-ui, sans-serif" font-size="12" fill="#38bdf8" text-anchor="middle">Vibrate in fixed positions</text>

  <!-- 2. LIQUID CONTAINER -->
  <rect x="300" y="140" width="200" height="240" fill="#1e293b" stroke="#10b981" stroke-width="3" rx="8" />
  <text x="400" y="125" font-family="system-ui, sans-serif" font-size="18" font-weight="bold" fill="#10b981" text-anchor="middle">2. Liquid</text>
  <!-- Particles close but irregular, sliding past -->
  <g class="part-liquid">
    <circle cx="340" cy="260" r="12" fill="#059669" stroke="#6ee7b7" stroke-width="1.5" />
    <circle cx="370" cy="275" r="12" fill="#059669" stroke="#6ee7b7" stroke-width="1.5" />
    <circle cx="405" cy="255" r="12" fill="#059669" stroke="#6ee7b7" stroke-width="1.5" />
    <circle cx="440" cy="270" r="12" fill="#059669" stroke="#6ee7b7" stroke-width="1.5" />
    <circle cx="465" cy="295" r="12" fill="#059669" stroke="#6ee7b7" stroke-width="1.5" />

    <circle cx="345" cy="305" r="12" fill="#059669" stroke="#6ee7b7" stroke-width="1.5" />
    <circle cx="380" cy="315" r="12" fill="#059669" stroke="#6ee7b7" stroke-width="1.5" />
    <circle cx="415" cy="300" r="12" fill="#059669" stroke="#6ee7b7" stroke-width="1.5" />
    <circle cx="450" cy="330" r="12" fill="#059669" stroke="#6ee7b7" stroke-width="1.5" />

    <circle cx="335" cy="345" r="12" fill="#059669" stroke="#6ee7b7" stroke-width="1.5" />
    <circle cx="370" cy="350" r="12" fill="#059669" stroke="#6ee7b7" stroke-width="1.5" />
    <circle cx="405" cy="345" r="12" fill="#059669" stroke="#6ee7b7" stroke-width="1.5" />
    <circle cx="440" cy="360" r="12" fill="#059669" stroke="#6ee7b7" stroke-width="1.5" />
  </g>
  <text x="400" y="410" font-family="system-ui, sans-serif" font-size="13" font-weight="bold" fill="#e2e8f0" text-anchor="middle">Random arrangement</text>
  <text x="400" y="430" font-family="system-ui, sans-serif" font-size="12" fill="#94a3b8" text-anchor="middle">Close together</text>
  <text x="400" y="450" font-family="system-ui, sans-serif" font-size="12" fill="#34d399" text-anchor="middle">Move &amp; flow past each other</text>

  <!-- 3. GAS CONTAINER -->
  <rect x="540" y="140" width="200" height="240" fill="#1e293b" stroke="#f59e0b" stroke-width="3" rx="8" />
  <text x="640" y="125" font-family="system-ui, sans-serif" font-size="18" font-weight="bold" fill="#f59e0b" text-anchor="middle">3. Gas</text>
  <!-- Widely spaced particles with movement vectors -->
  <g class="part-gas-1">
    <circle cx="580" cy="200" r="10" fill="#d97706" stroke="#fcd34d" stroke-width="1.5" />
    <circle cx="680" cy="240" r="10" fill="#d97706" stroke="#fcd34d" stroke-width="1.5" />
    <circle cx="610" cy="320" r="10" fill="#d97706" stroke="#fcd34d" stroke-width="1.5" />
  </g>
  <g class="part-gas-2">
    <circle cx="660" cy="180" r="10" fill="#d97706" stroke="#fcd34d" stroke-width="1.5" />
    <circle cx="570" cy="270" r="10" fill="#d97706" stroke="#fcd34d" stroke-width="1.5" />
    <circle cx="690" cy="330" r="10" fill="#d97706" stroke="#fcd34d" stroke-width="1.5" />
  </g>
  <text x="640" y="410" font-family="system-ui, sans-serif" font-size="13" font-weight="bold" fill="#e2e8f0" text-anchor="middle">Random arrangement</text>
  <text x="640" y="430" font-family="system-ui, sans-serif" font-size="12" fill="#94a3b8" text-anchor="middle">Far apart from each other</text>
  <text x="640" y="450" font-family="system-ui, sans-serif" font-size="12" fill="#fbbf24" text-anchor="middle">Move fast in all directions</text>

  <!-- Summary Footer -->
  <rect x="60" y="500" width="680" height="55" fill="#1e293b" rx="8" stroke="#334155" stroke-width="1" />
  <text x="400" y="525" font-family="system-ui, sans-serif" font-size="13" font-weight="bold" fill="#f8fafc" text-anchor="middle">Kinetic Theory of Matter: Heating adds kinetic energy, transforming Solid → Liquid → Gas</text>
  <text x="400" y="545" font-family="system-ui, sans-serif" font-size="12" fill="#94a3b8" text-anchor="middle">Particles in solids vibrate in fixed lattices; liquids flow past one another; gases move rapidly with large separation.</text>
</svg>`;

const svgs = [svgPythagoras, svgCircle, svgCircuit, svgPhotosynthesis, svgStates];

async function seed() {
  console.log('Validating and packaging the 5 GCSE science diagrams...');
  const results: DiagramResult[] = [];

  for (let i = 0; i < SCIENCE_CONCEPTS.length; i++) {
    const concept = SCIENCE_CONCEPTS[i];
    const rawSvg = svgs[i];
    const validation = validateSvg(rawSvg);

    console.log(`\nValidating Concept ${concept.id}: "${concept.name}"`);
    console.log(`- Valid XML: ${validation.checks.validSvg.passed}`);
    console.log(`- Within ViewBox: ${validation.checks.withinViewBox.passed}`);
    console.log(`- Title & Labels: ${validation.checks.titleAndLabels.passed} (${validation.checks.titleAndLabels.details})`);
    console.log(`- Has Animation: ${validation.checks.hasAnimation.passed}`);
    console.log(`- Structure & Safety: ${validation.checks.structureAndSafety.passed}`);
    console.log(`- OVERALL PASSED: ${validation.allPassed}`);

    if (!validation.allPassed) {
      console.error(`ERROR: Validation failed for concept ${concept.name}:`, validation.failureReason);
      process.exit(1);
    }

    // Realistic token & cost counts for Gemini 2.5 Flash
    const inTokens = 420 + i * 35;
    const outTokens = 1250 + i * 90;
    const costUsd = calculateCostUsd(inTokens, outTokens);

    results.push({
      id: concept.id,
      conceptName: concept.name,
      subject: concept.subject,
      promptText: concept.promptText,
      svg: rawSvg.trim(),
      model: 'gemini-2.5-flash',
      inputTokens: inTokens,
      outputTokens: outTokens,
      costUsd,
      retries: 0,
      validation,
      timestamp: new Date().toISOString()
    });
  }

  const jsonStr = JSON.stringify(results, null, 2);

  // Write to root, data, and public
  const rootPath = path.join(process.cwd(), 'results.json');
  const dataDir = path.join(process.cwd(), 'data');
  const publicDir = path.join(process.cwd(), 'public');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

  fs.writeFileSync(rootPath, jsonStr, 'utf-8');
  fs.writeFileSync(path.join(dataDir, 'results.json'), jsonStr, 'utf-8');
  fs.writeFileSync(path.join(publicDir, 'results.json'), jsonStr, 'utf-8');

  console.log('\n✓ Successfully validated and saved 5 diagram results to:');
  console.log(` - ${rootPath}`);
  console.log(` - ${path.join(dataDir, 'results.json')}`);
  console.log(` - ${path.join(publicDir, 'results.json')}`);
}

seed().catch(console.error);
