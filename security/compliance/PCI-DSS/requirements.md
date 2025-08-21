# PCI DSS Requirements Implementation

## PCI DSS 4.0 Requirements

### Requirement 1: Install and maintain network security controls
**1.1** Processes and mechanisms for implementing and maintaining network security controls
- **1.1.1**: Document network security control processes
- **1.1.2**: Maintain network diagrams and data flow documentation

**1.2** Network security controls (NSCs) are configured and maintained
- **1.2.1**: Configuration standards for NSC rulesets
- **1.2.2**: NSC rulesets restrict connections between untrusted networks
- **1.2.3**: NSC rulesets restrict inbound traffic to services necessary for CDE
- **1.2.4**: NSC rulesets restrict outbound traffic from CDE
- **1.2.5**: NSC rulesets are implemented on all network connections

### Requirement 2: Apply secure configurations to all system components
**2.1** Processes and mechanisms for applying secure configurations
- **2.1.1**: Document secure configuration processes
- **2.1.2**: Maintain inventory of system components in scope

**2.2** System components are configured securely
- **2.2.1**: Configuration standards address known security vulnerabilities
- **2.2.2**: Vendor default accounts are managed
- **2.2.3**: Primary functions requiring different security levels are managed
- **2.2.4**: System security parameters are configured to prevent misuse
- **2.2.5**: All non-console administrative access is encrypted
- **2.2.6**: System security parameters are configured on common services
- **2.2.7**: All non-console administrative access is encrypted using strong cryptography

### Requirement 3: Protect stored cardholder data
**3.1** Processes and mechanisms for protecting stored cardholder data
- **3.1.1**: Document data protection processes
- **3.1.2**: Maintain inventory of locations where CHD is stored

**3.2** Storage of cardholder data is kept to a minimum
- **3.2.1**: CHD storage is limited to business justification
- **3.2.2**: CHD is purged when no longer needed
- **3.2.3**: Quarterly confirmation that stored CHD doesn't exceed requirements

**3.3** Sensitive authentication data is not stored after authorization
- **3.3.1**: SAD is not retained after authorization
- **3.3.2**: SAD is rendered unrecoverable if stored before authorization
- **3.3.3**: SAD in non-persistent memory is cleared after authorization

**3.4** Access to displays of full PAN is restricted
- **3.4.1**: PAN is masked when displayed
- **3.4.2**: PAN is protected when displayed on screens, paper, etc.

**3.5** Primary account number (PAN) is protected wherever it is stored
- **3.5.1**: PAN is rendered unreadable using approved methods
- **3.5.2**: PAN stored in non-persistent memory is protected

### Requirement 4: Protect cardholder data with strong cryptography during transmission over open, public networks
**4.1** Processes and mechanisms for protecting CHD with strong cryptography during transmission
- **4.1.1**: Document cryptographic processes for data transmission
- **4.1.2**: Maintain inventory of trusted keys and certificates

**4.2** PAN is protected with strong cryptography during transmission
- **4.2.1**: Strong cryptography and security protocols protect PAN during transmission
- **4.2.2**: PAN is never sent via unprotected messaging technologies

### Requirement 5: Protect all systems and networks from malicious software
**5.1** Processes and mechanisms for protecting systems from malicious software
- **5.1.1**: Document anti-malware processes
- **5.1.2**: Maintain inventory of system components at risk from malware

**5.2** Malicious software is prevented or detected and addressed
- **5.2.1**: Anti-malware solutions are deployed on applicable systems
- **5.2.2**: Anti-malware solutions are kept current
- **5.2.3**: Anti-malware solutions are actively running and cannot be disabled

**5.3** Anti-malware mechanisms and processes are active and maintained
- **5.3.1**: Anti-malware solutions perform periodic scans
- **5.3.2**: Anti-malware solutions generate audit logs
- **5.3.3**: Anti-malware solutions are evaluated periodically

### Requirement 6: Develop and maintain secure systems and software
**6.1** Processes and mechanisms for developing and maintaining secure systems and software
- **6.1.1**: Document secure development processes
- **6.1.2**: Maintain inventory of bespoke and custom software

**6.2** Bespoke and custom software are developed securely
- **6.2.1**: Bespoke and custom software is developed according to PCI DSS
- **6.2.2**: Software development personnel receive training
- **6.2.3**: Bespoke and custom software is reviewed prior to release
- **6.2.4**: Software engineering techniques prevent common vulnerabilities

**6.3** Security vulnerabilities are identified and addressed
- **6.3.1**: Security vulnerabilities are identified using defined processes
- **6.3.2**: An inventory of bespoke and custom software is maintained
- **6.3.3**: All system components are protected from known vulnerabilities

### Implementation Status

| Requirement | Status | Implementation Date | Evidence Location |
|-------------|--------|-------------------|------------------|
| 1.1.1 | ✅ Complete | 2024-01-15 | /evidence/req1/ |
| 1.1.2 | ✅ Complete | 2024-01-20 | /evidence/req1/ |
| 1.2.1 | 🔄 In Progress | 2024-02-15 | /evidence/req1/ |
| 2.1.1 | ✅ Complete | 2024-01-25 | /evidence/req2/ |
| 3.1.1 | ✅ Complete | 2024-02-01 | /evidence/req3/ |

## Quarterly Self-Assessment

### Q1 2024 Assessment Results
- **Overall Compliance**: 85%
- **Critical Findings**: 2
- **High Findings**: 5
- **Medium Findings**: 12
- **Low Findings**: 8

### Remediation Plan
1. **Critical Finding 1**: Implement network segmentation (Due: 2024-03-15)
2. **Critical Finding 2**: Update encryption protocols (Due: 2024-03-10)
3. **High Priority Items**: Address within 30 days
4. **Medium Priority Items**: Address within 90 days

## Annual Assessment Schedule
- **Q1**: Requirements 1-3 detailed assessment
- **Q2**: Requirements 4-6 detailed assessment
- **Q3**: Requirements 7-9 detailed assessment
- **Q4**: Requirements 10-12 detailed assessment and annual review