#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Deploy scaling infrastructure for the ecommerce inventory system
.DESCRIPTION
    Deploys Kubernetes manifests, Terraform infrastructure, and configures auto-scaling
.PARAMETER Environment
    Target environment (development, staging, production)
.PARAMETER TerraformAction
    Terraform action to perform (plan, apply, destroy)
.PARAMETER SkipTerraform
    Skip Terraform deployment
.PARAMETER SkipKubernetes
    Skip Kubernetes deployment
#>

param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("development", "staging", "production")]
    [string]$Environment,
    
    [ValidateSet("plan", "apply", "destroy")]
    [string]$TerraformAction = "plan",
    
    [switch]$SkipTerraform,
    
    [switch]$SkipKubernetes,
    
    [string]$KubeConfig = "$env:HOME/.kube/config",
    
    [string]$TerraformDir = "infrastructure/terraform",
    
    [string]$KubernetesDir = "infrastructure/kubernetes"
)

# Set error action preference
$ErrorActionPreference = "Stop"

# Configuration
$namespace = "ecommerce-inventory"
if ($Environment -eq "staging") {
    $namespace = "ecommerce-inventory-staging"
}

# Logging function
function Write-Log {
    param(
        [string]$Message,
        [ValidateSet("INFO", "WARN", "ERROR")]
        [string]$Level = "INFO"
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"
    
    switch ($Level) {
        "INFO" { Write-Host $logMessage -ForegroundColor Green }
        "WARN" { Write-Host $logMessage -ForegroundColor Yellow }
        "ERROR" { Write-Host $logMessage -ForegroundColor Red }
    }
}

# Function to check prerequisites
function Test-Prerequisites {
    Write-Log "Checking prerequisites..." -Level "INFO"
    
    # Check kubectl
    if (!(Get-Command kubectl -ErrorAction SilentlyContinue)) {
        Write-Log "kubectl not found in PATH" -Level "ERROR"
        return $false
    }
    
    # Check terraform
    if (!$SkipTerraform -and !(Get-Command terraform -ErrorAction SilentlyContinue)) {
        Write-Log "terraform not found in PATH" -Level "ERROR"
        return $false
    }
    
    # Check AWS CLI
    if (!$SkipTerraform -and !(Get-Command aws -ErrorAction SilentlyContinue)) {
        Write-Log "aws CLI not found in PATH" -Level "ERROR"
        return $false
    }
    
    # Check directories
    if (!$SkipTerraform -and !(Test-Path $TerraformDir)) {
        Write-Log "Terraform directory not found: $TerraformDir" -Level "ERROR"
        return $false
    }
    
    if (!$SkipKubernetes -and !(Test-Path $KubernetesDir)) {
        Write-Log "Kubernetes directory not found: $KubernetesDir" -Level "ERROR"
        return $false
    }
    
    Write-Log "Prerequisites check passed" -Level "INFO"
    return $true
}

# Function to deploy Terraform infrastructure
function Deploy-TerraformInfrastructure {
    Write-Log "Deploying Terraform infrastructure..." -Level "INFO"
    
    try {
        Push-Location $TerraformDir
        
        # Initialize Terraform
        Write-Log "Initializing Terraform..." -Level "INFO"
        terraform init -upgrade
        
        if ($LASTEXITCODE -ne 0) {
            throw "Terraform init failed"
        }
        
        # Create workspace if it doesn't exist
        $workspaces = terraform workspace list
        if ($workspaces -notcontains $Environment) {
            Write-Log "Creating Terraform workspace: $Environment" -Level "INFO"
            terraform workspace new $Environment
        }
        else {
            Write-Log "Selecting Terraform workspace: $Environment" -Level "INFO"
            terraform workspace select $Environment
        }
        
        # Set variables file
        $varsFile = "terraform.tfvars"
        if (Test-Path "environments/$Environment.tfvars") {
            $varsFile = "environments/$Environment.tfvars"
        }
        
        # Execute Terraform action
        switch ($TerraformAction) {
            "plan" {
                Write-Log "Running Terraform plan..." -Level "INFO"
                terraform plan -var-file=$varsFile -out="tfplan-$Environment"
            }
            "apply" {
                Write-Log "Running Terraform apply..." -Level "INFO"
                if (Test-Path "tfplan-$Environment") {
                    terraform apply "tfplan-$Environment"
                }
                else {
                    terraform apply -var-file=$varsFile -auto-approve
                }
            }
            "destroy" {
                Write-Log "Running Terraform destroy..." -Level "WARN"
                terraform destroy -var-file=$varsFile -auto-approve
            }
        }
        
        if ($LASTEXITCODE -ne 0) {
            throw "Terraform $TerraformAction failed"
        }
        
        # Output important values
        if ($TerraformAction -eq "apply") {
            Write-Log "Getting Terraform outputs..." -Level "INFO"
            $outputs = terraform output -json | ConvertFrom-Json
            
            # Save outputs to file for later use
            $outputsFile = "terraform-outputs-$Environment.json"
            $outputs | ConvertTo-Json -Depth 10 | Out-File $outputsFile
            Write-Log "Terraform outputs saved to: $outputsFile" -Level "INFO"
        }
        
        Write-Log "Terraform deployment completed successfully" -Level "INFO"
    }
    catch {
        Write-Log "Terraform deployment failed: $($_.Exception.Message)" -Level "ERROR"
        throw
    }
    finally {
        Pop-Location
    }
}

# Function to deploy Kubernetes manifests
function Deploy-KubernetesManifests {
    Write-Log "Deploying Kubernetes manifests..." -Level "INFO"
    
    try {
        # Set kubeconfig
        $env:KUBECONFIG = $KubeConfig
        
        # Test cluster connectivity
        kubectl cluster-info --request-timeout=10s | Out-Null
        if ($LASTEXITCODE -ne 0) {
            throw "Cannot connect to Kubernetes cluster"
        }
        
        # Create namespace if it doesn't exist
        Write-Log "Creating namespace: $namespace" -Level "INFO"
        kubectl create namespace $namespace --dry-run=client -o yaml | kubectl apply -f -
        
        # Deploy manifests in order
        $manifestOrder = @(
            "namespace.yaml",
            "secrets.yaml",
            "configmap.yaml",
            "postgres-deployment.yaml",
            "redis-deployment.yaml",
            "api-deployment.yaml",
            "web-deployment.yaml",
            "nginx-deployment.yaml",
            "monitoring.yaml"
        )
        
        foreach ($manifest in $manifestOrder) {
            $manifestPath = Join-Path $KubernetesDir $manifest
            
            if (Test-Path $manifestPath) {
                Write-Log "Applying manifest: $manifest" -Level "INFO"
                
                # Replace environment-specific values
                $content = Get-Content $manifestPath -Raw
                $content = $content -replace "ecommerce-inventory-staging", $namespace
                $content = $content -replace "ecommerce-inventory(?!-)", $namespace
                
                # Apply manifest
                $content | kubectl apply -f -
                
                if ($LASTEXITCODE -ne 0) {
                    throw "Failed to apply manifest: $manifest"
                }
            }
            else {
                Write-Log "Manifest not found: $manifestPath" -Level "WARN"
            }
        }
        
        # Wait for deployments to be ready
        Write-Log "Waiting for deployments to be ready..." -Level "INFO"
        
        $deployments = @("postgres", "redis", "api", "web", "nginx")
        foreach ($deployment in $deployments) {
            Write-Log "Waiting for deployment: $deployment" -Level "INFO"
            kubectl wait --for=condition=available --timeout=300s deployment/$deployment -n $namespace
            
            if ($LASTEXITCODE -ne 0) {
                Write-Log "Deployment $deployment did not become ready in time" -Level "WARN"
            }
        }
        
        # Display deployment status
        Write-Log "Deployment status:" -Level "INFO"
        kubectl get deployments -n $namespace
        kubectl get services -n $namespace
        kubectl get pods -n $namespace
        
        Write-Log "Kubernetes deployment completed successfully" -Level "INFO"
    }
    catch {
        Write-Log "Kubernetes deployment failed: $($_.Exception.Message)" -Level "ERROR"
        throw
    }
}

# Function to configure auto-scaling
function Configure-AutoScaling {
    Write-Log "Configuring auto-scaling..." -Level "INFO"
    
    try {
        # Enable metrics server if not already enabled
        Write-Log "Checking metrics server..." -Level "INFO"
        $metricsServer = kubectl get deployment metrics-server -n kube-system --ignore-not-found
        
        if (!$metricsServer) {
            Write-Log "Installing metrics server..." -Level "INFO"
            kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
            
            # Wait for metrics server to be ready
            kubectl wait --for=condition=available --timeout=300s deployment/metrics-server -n kube-system
        }
        
        # Create HPA for API deployment
        Write-Log "Creating HPA for API deployment..." -Level "INFO"
        kubectl autoscale deployment api --cpu-percent=70 --min=2 --max=10 -n $namespace
        
        # Create HPA for Web deployment
        Write-Log "Creating HPA for Web deployment..." -Level "INFO"
        kubectl autoscale deployment web --cpu-percent=70 --min=2 --max=6 -n $namespace
        
        # Display HPA status
        Write-Log "HPA status:" -Level "INFO"
        kubectl get hpa -n $namespace
        
        Write-Log "Auto-scaling configuration completed" -Level "INFO"
    }
    catch {
        Write-Log "Auto-scaling configuration failed: $($_.Exception.Message)" -Level "ERROR"
        throw
    }
}

# Function to setup monitoring
function Setup-Monitoring {
    Write-Log "Setting up monitoring..." -Level "INFO"
    
    try {
        # Install Prometheus Operator if not already installed
        $prometheusOperator = kubectl get crd prometheuses.monitoring.coreos.com --ignore-not-found
        
        if (!$prometheusOperator) {
            Write-Log "Installing Prometheus Operator..." -Level "INFO"
            kubectl apply -f https://raw.githubusercontent.com/prometheus-operator/prometheus-operator/main/bundle.yaml
            
            # Wait for operator to be ready
            Start-Sleep -Seconds 30
        }
        
        # Create ServiceMonitor for applications
        $serviceMonitorYaml = @"
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: app-metrics
  namespace: $namespace
spec:
  selector:
    matchLabels:
      app: api
  endpoints:
  - port: metrics
    interval: 30s
    path: /metrics
"@
        
        $serviceMonitorYaml | kubectl apply -f -
        
        Write-Log "Monitoring setup completed" -Level "INFO"
    }
    catch {
        Write-Log "Monitoring setup failed: $($_.Exception.Message)" -Level "ERROR"
        Write-Log "Continuing without monitoring..." -Level "WARN"
    }
}

# Function to validate deployment
function Test-Deployment {
    Write-Log "Validating deployment..." -Level "INFO"
    
    try {
        # Check pod status
        $pods = kubectl get pods -n $namespace -o json | ConvertFrom-Json
        $failedPods = $pods.items | Where-Object { $_.status.phase -ne "Running" }
        
        if ($failedPods) {
            Write-Log "Found failed pods:" -Level "WARN"
            foreach ($pod in $failedPods) {
                Write-Log "  $($pod.metadata.name): $($pod.status.phase)" -Level "WARN"
            }
        }
        
        # Check service endpoints
        $services = kubectl get services -n $namespace -o json | ConvertFrom-Json
        foreach ($service in $services.items) {
            if ($service.spec.type -eq "LoadBalancer") {
                $loadBalancerIP = $service.status.loadBalancer.ingress[0].ip
                if ($loadBalancerIP) {
                    Write-Log "LoadBalancer service $($service.metadata.name) has IP: $loadBalancerIP" -Level "INFO"
                }
                else {
                    Write-Log "LoadBalancer service $($service.metadata.name) is pending IP assignment" -Level "WARN"
                }
            }
        }
        
        # Test API health endpoint
        $apiService = kubectl get service api-service -n $namespace -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>$null
        if ($apiService) {
            try {
                $healthCheck = Invoke-RestMethod -Uri "http://$apiService:3001/health" -TimeoutSec 10
                Write-Log "API health check passed: $($healthCheck | ConvertTo-Json -Compress)" -Level "INFO"
            }
            catch {
                Write-Log "API health check failed: $($_.Exception.Message)" -Level "WARN"
            }
        }
        
        Write-Log "Deployment validation completed" -Level "INFO"
    }
    catch {
        Write-Log "Deployment validation failed: $($_.Exception.Message)" -Level "ERROR"
    }
}

# Main deployment function
function Start-Deployment {
    Write-Log "Starting scaling infrastructure deployment for environment: $Environment" -Level "INFO"
    
    try {
        # Check prerequisites
        if (!(Test-Prerequisites)) {
            throw "Prerequisites check failed"
        }
        
        # Deploy Terraform infrastructure
        if (!$SkipTerraform) {
            Deploy-TerraformInfrastructure
        }
        else {
            Write-Log "Skipping Terraform deployment" -Level "INFO"
        }
        
        # Deploy Kubernetes manifests
        if (!$SkipKubernetes) {
            Deploy-KubernetesManifests
            Configure-AutoScaling
            Setup-Monitoring
            Test-Deployment
        }
        else {
            Write-Log "Skipping Kubernetes deployment" -Level "INFO"
        }
        
        Write-Log "Scaling infrastructure deployment completed successfully!" -Level "INFO"
        
        # Display next steps
        Write-Log "Next steps:" -Level "INFO"
        Write-Log "1. Update DNS records to point to the load balancer" -Level "INFO"
        Write-Log "2. Configure SSL certificates" -Level "INFO"
        Write-Log "3. Set up monitoring dashboards" -Level "INFO"
        Write-Log "4. Run the auto-scaling script: ./scripts/scaling/auto-scale.ps1 -Environment $Environment" -Level "INFO"
        
    }
    catch {
        Write-Log "Deployment failed: $($_.Exception.Message)" -Level "ERROR"
        exit 1
    }
}

# Script entry point
if ($MyInvocation.InvocationName -ne '.') {
    Start-Deployment
}