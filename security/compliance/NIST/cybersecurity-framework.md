# NIST Cybersecurity Framework Implementation

## Framework Overview
The NIST Cybersecurity Framework provides a policy framework of computer security guidance for how private sector organizations can assess and improve their ability to prevent, detect, and respond to cyber attacks.

## Core Functions

### 1. IDENTIFY (ID)
Develop an organizational understanding to manage cybersecurity risk to systems, people, assets, data, and capabilities.

#### ID.AM - Asset Management
- **ID.AM-1**: Physical devices and systems are inventoried
- **ID.AM-2**: Software platforms and applications are inventoried
- **ID.AM-3**: Organizational communication and data flows are mapped
- **ID.AM-4**: External information systems are catalogued
- **ID.AM-5**: Resources are prioritized based on classification, criticality, and business value
- **ID.AM-6**: Cybersecurity roles and responsibilities are established

#### ID.BE - Business Environment
- **ID.BE-1**: Organization's role in the supply chain is identified and communicated
- **ID.BE-2**: Organization's place in critical infrastructure is identified and communicated
- **ID.BE-3**: Priorities for organizational mission, objectives, and activities are established
- **ID.BE-4**: Dependencies and critical functions for delivery of services are established
- **ID.BE-5**: Resilience requirements to support delivery of services are established

#### ID.GV - Governance
- **ID.GV-1**: Organizational cybersecurity policy is established and communicated
- **ID.GV-2**: Cybersecurity roles and responsibilities are coordinated and aligned
- **ID.GV-3**: Legal and regulatory requirements are understood and managed
- **ID.GV-4**: Governance and risk management processes address cybersecurity risks

#### ID.RA - Risk Assessment
- **ID.RA-1**: Asset vulnerabilities are identified and documented
- **ID.RA-2**: Cyber threat intelligence is received from information sharing forums
- **ID.RA-3**: Threats, both internal and external, are identified and documented
- **ID.RA-4**: Potential business impacts and likelihoods are identified
- **ID.RA-5**: Threats, vulnerabilities, likelihoods, and impacts are used to determine risk
- **ID.RA-6**: Risk responses are identified and prioritized

#### ID.RM - Risk Management Strategy
- **ID.RM-1**: Risk management processes are established, managed, and agreed to
- **ID.RM-2**: Organizational risk tolerance is determined and clearly expressed
- **ID.RM-3**: Organization's determination of risk tolerance is informed by its role

#### ID.SC - Supply Chain Risk Management
- **ID.SC-1**: Cyber supply chain risk management processes are identified
- **ID.SC-2**: Suppliers and third-party partners are identified, prioritized, and assessed
- **ID.SC-3**: Contracts with suppliers and third-party partners address cybersecurity
- **ID.SC-4**: Suppliers and third-party partners are routinely assessed
- **ID.SC-5**: Response and recovery planning includes suppliers and third-party providers

### 2. PROTECT (PR)
Develop and implement appropriate safeguards to ensure delivery of critical services.

#### PR.AC - Identity Management, Authentication and Access Control
- **PR.AC-1**: Identities and credentials are issued, managed, verified, revoked, and audited
- **PR.AC-2**: Physical access to assets is managed and protected
- **PR.AC-3**: Remote access is managed
- **PR.AC-4**: Access permissions and authorizations are managed
- **PR.AC-5**: Network integrity is protected
- **PR.AC-6**: Identities are proofed and bound to credentials and asserted in interactions
- **PR.AC-7**: Users, devices, and other assets are authenticated

#### PR.AT - Awareness and Training
- **PR.AT-1**: All users are informed and trained
- **PR.AT-2**: Privileged users understand their roles and responsibilities
- **PR.AT-3**: Third-party stakeholders understand their roles and responsibilities
- **PR.AT-4**: Senior executives understand their roles and responsibilities
- **PR.AT-5**: Physical and cybersecurity personnel understand their roles

#### PR.DS - Data Security
- **PR.DS-1**: Data-at-rest is protected
- **PR.DS-2**: Data-in-transit is protected
- **PR.DS-3**: Assets are formally managed throughout removal, transfers, and disposition
- **PR.DS-4**: Adequate capacity to ensure availability is maintained
- **PR.DS-5**: Protections against data leaks are implemented
- **PR.DS-6**: Integrity checking mechanisms are used to verify software and information
- **PR.DS-7**: Development and testing environment(s) are separate from production
- **PR.DS-8**: Integrity checking mechanisms are used to verify hardware and software

#### PR.IP - Information Protection Processes and Procedures
- **PR.IP-1**: A baseline configuration of information technology is created and maintained
- **PR.IP-2**: A System Development Life Cycle to manage systems is implemented
- **PR.IP-3**: Configuration change control processes are in place
- **PR.IP-4**: Backups of information are conducted, maintained, and tested
- **PR.IP-5**: Policy and regulations regarding the physical operating environment
- **PR.IP-6**: Data is destroyed according to policy
- **PR.IP-7**: Protection processes are improved
- **PR.IP-8**: Effectiveness of protection technologies is shared
- **PR.IP-9**: Response plans and recovery plans are in place and managed
- **PR.IP-10**: Response and recovery plans are tested
- **PR.IP-11**: Cybersecurity is included in human resources practices
- **PR.IP-12**: A vulnerability management plan is developed and implemented

#### PR.MA - Maintenance
- **PR.MA-1**: Maintenance and repair of organizational assets are performed
- **PR.MA-2**: Remote maintenance of organizational assets is approved, logged, and performed

#### PR.PT - Protective Technology
- **PR.PT-1**: Audit/log records are determined, documented, implemented, and reviewed
- **PR.PT-2**: Removable media is protected and its use restricted
- **PR.PT-3**: The principle of least functionality is incorporated
- **PR.PT-4**: Communications and control networks are protected
- **PR.PT-5**: Mechanisms are implemented to achieve resilience requirements

### 3. DETECT (DE)
Develop and implement appropriate activities to identify the occurrence of a cybersecurity event.

#### DE.AE - Anomalies and Events
- **DE.AE-1**: A baseline of network operations and expected data flows is established
- **DE.AE-2**: Detected events are analyzed to understand attack targets and methods
- **DE.AE-3**: Event data are collected and correlated from multiple sources and sensors
- **DE.AE-4**: Impact of events is determined
- **DE.AE-5**: Incident alert thresholds are established

#### DE.CM - Security Continuous Monitoring
- **DE.CM-1**: The network is monitored to detect potential cybersecurity events
- **DE.CM-2**: The physical environment is monitored to detect potential cybersecurity events
- **DE.CM-3**: Personnel activity is monitored to detect potential cybersecurity events
- **DE.CM-4**: Malicious code is detected
- **DE.CM-5**: Unauthorized mobile code is detected
- **DE.CM-6**: External service provider activity is monitored
- **DE.CM-7**: Monitoring for unauthorized personnel, connections, devices, and software
- **DE.CM-8**: Vulnerability scans are performed

#### DE.DP - Detection Processes
- **DE.DP-1**: Roles and responsibilities for detection are well defined
- **DE.DP-2**: Detection activities comply with all applicable requirements
- **DE.DP-3**: Detection processes are tested
- **DE.DP-4**: Event detection information is communicated
- **DE.DP-5**: Detection processes are continuously improved

### 4. RESPOND (RS)
Develop and implement appropriate activities to take action regarding a detected cybersecurity incident.

#### RS.RP - Response Planning
- **RS.RP-1**: Response plan is executed during or after an incident

#### RS.CO - Communications
- **RS.CO-1**: Personnel know their roles and order of operations when a response is needed
- **RS.CO-2**: Incidents are reported consistent with established criteria
- **RS.CO-3**: Information is shared consistent with response plans
- **RS.CO-4**: Coordination with stakeholders occurs consistent with response plans
- **RS.CO-5**: Voluntary information sharing occurs with external stakeholders

#### RS.AN - Analysis
- **RS.AN-1**: Notifications from detection systems are investigated
- **RS.AN-2**: The impact of the incident is understood
- **RS.AN-3**: Forensics are performed
- **RS.AN-4**: Incidents are categorized consistent with response plans
- **RS.AN-5**: Processes are established to receive, analyze and respond to vulnerabilities

#### RS.MI - Mitigation
- **RS.MI-1**: Incidents are contained
- **RS.MI-2**: Incidents are mitigated
- **RS.MI-3**: Newly identified vulnerabilities are mitigated or documented as accepted risks

#### RS.IM - Improvements
- **RS.IM-1**: Response plans incorporate lessons learned
- **RS.IM-2**: Response strategies are updated

### 5. RECOVER (RC)
Develop and implement appropriate activities to maintain plans for resilience and to restore any capabilities or services that were impaired due to a cybersecurity incident.

#### RC.RP - Recovery Planning
- **RC.RP-1**: Recovery plan is executed during or after a cybersecurity incident

#### RC.IM - Improvements
- **RC.IM-1**: Recovery plans incorporate lessons learned
- **RC.IM-2**: Recovery strategies are updated

#### RC.CO - Communications
- **RC.CO-1**: Public relations are managed
- **RC.CO-2**: Reputation is repaired after an incident
- **RC.CO-3**: Recovery activities are communicated to internal and external stakeholders

## Implementation Tiers

### Tier 1: Partial
- Risk management practices are not formalized
- Limited awareness of cybersecurity risk
- No organization-wide approach to managing cybersecurity risk
- Cybersecurity risk management is performed on an irregular, case-by-case basis

### Tier 2: Risk Informed
- Risk management practices are approved by management but may not be established as organizational-wide policy
- There is an awareness of cybersecurity risk at the organizational level
- Organization-wide approach to managing cybersecurity risk has not been established

### Tier 3: Repeatable
- Organization's risk management practices are formally approved and expressed as policy
- Organizational cybersecurity practices are regularly updated based on application of risk management processes
- Consistent methods are in place to respond effectively to changes in risk

### Tier 4: Adaptive
- Organization adapts its cybersecurity practices based on lessons learned and predictive indicators
- Organization actively shares information with partners to improve cybersecurity before a cybersecurity event occurs
- Organization uses real-time or near real-time information to understand and consistently act upon cybersecurity risk

## Current Implementation Status

| Function | Subcategory | Current Tier | Target Tier | Implementation Status | Due Date |
|----------|-------------|--------------|-------------|----------------------|----------|
| ID.AM-1 | Asset Management | 2 | 3 | In Progress | 2024-03-31 |
| ID.AM-2 | Software Inventory | 2 | 3 | In Progress | 2024-03-31 |
| PR.AC-1 | Identity Management | 3 | 3 | Complete | - |
| PR.AC-3 | Remote Access | 2 | 3 | Planned | 2024-04-30 |
| DE.CM-1 | Network Monitoring | 3 | 4 | In Progress | 2024-05-31 |

## Gap Analysis

### High Priority Gaps
1. **Asset Management (ID.AM)**: Incomplete inventory of all organizational assets
2. **Risk Assessment (ID.RA)**: Formal risk assessment process needs enhancement
3. **Detection Processes (DE.DP)**: Detection processes need better documentation and testing
4. **Response Planning (RS.RP)**: Incident response plans need regular testing and updates

### Medium Priority Gaps
1. **Supply Chain Risk Management (ID.SC)**: Third-party risk assessment process
2. **Data Security (PR.DS)**: Data classification and handling procedures
3. **Continuous Monitoring (DE.CM)**: Enhanced monitoring capabilities needed
4. **Recovery Planning (RC.RP)**: Business continuity and disaster recovery plans

## Action Plan

### Q1 2024
- Complete asset inventory (ID.AM-1, ID.AM-2)
- Implement formal risk assessment process (ID.RA-1 through ID.RA-6)
- Enhance network monitoring capabilities (DE.CM-1)
- Update incident response procedures (RS.RP-1)

### Q2 2024
- Implement data classification program (PR.DS-1, PR.DS-2)
- Enhance remote access controls (PR.AC-3)
- Implement vulnerability management program (PR.IP-12)
- Conduct tabletop exercises (PR.IP-10)

### Q3 2024
- Implement supply chain risk management (ID.SC-1 through ID.SC-5)
- Enhance security awareness training (PR.AT-1 through PR.AT-5)
- Implement advanced threat detection (DE.AE-1 through DE.AE-5)
- Update recovery plans (RC.RP-1)

### Q4 2024
- Achieve Tier 3 implementation across all core functions
- Conduct annual framework assessment
- Plan for Tier 4 implementation in priority areas
- Update policies and procedures based on lessons learned