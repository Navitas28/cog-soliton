/**
 * Minimal EPANET INP: one reservoir (head 50m), one junction (elev 10m, demand 10 LPS),
 * one pipe (1000m, 300mm, C=130). SI/LPS/Hazen-Williams.
 * Expected junction pressure ≈ 50 - 10 - headloss ≈ ~37 m (physically sane positive value).
 */
export const MINIMAL_INP = `[TITLE]
Soliton Phase 1 Proof

[JUNCTIONS]
;ID              Elev            Demand          Pattern
 J1              10              10                              ;

[RESERVOIRS]
;ID              Head            Pattern
 R1              50                              ;

[TANKS]

[PIPES]
;ID              Node1           Node2           Length          Diameter        Roughness       MinorLoss       Status
 P1              R1              J1              1000            300             130             0               Open  ;

[PUMPS]

[VALVES]

[PATTERNS]

[CURVES]

[CONTROLS]

[RULES]

[ENERGY]

[EMITTERS]

[QUALITY]

[SOURCES]

[REACTIONS]

[MIXING]

[TIMES]
 Duration            0:00
 Hydraulic Timestep  1:00
 Quality Timestep    0:05
 Pattern Timestep    1:00
 Pattern Start       0:00
 Report Timestep     1:00
 Report Start        0:00
 Start ClockTime     12 am
 Statistic           NONE

[REPORT]
 Status              No
 Summary             No
 Page                0

[OPTIONS]
 Units               LPS
 Headloss            H-W
 Specific Gravity    1.0
 Viscosity           1.0
 Trials              40
 Accuracy            0.001
 CHECKFREQ           2
 MAXCHECK            10
 DAMPLIMIT           0
 Unbalanced          Continue 10
 Pattern             1
 Demand Multiplier   1.0
 Emitter Exponent    0.5
 Quality             None mg/L
 Diffusivity         1.0
 Tolerance           0.01

[COORDINATES]
;Node            X-Coord            Y-Coord
 R1              0.00               0.00
 J1              1000.00            0.00

[VERTICES]

[LABELS]

[BACKDROP]

[END]
`;
