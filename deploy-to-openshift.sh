#!/bin/bash

# Blake Marginalia OpenShift Deployment Script
# Usage: ./deploy-to-openshift.sh <git-repo-url>

set -e

APP_NAME="blake-marginalia"
GIT_URI=${1:-"https://github.com/your-username/blake-marginalia.git"}

echo "Deploying Blake Marginalia to OpenShift..."
echo "App Name: $APP_NAME"
echo "Git URI: $GIT_URI"

# Check if oc is installed
if ! command -v oc &> /dev/null; then
    echo "Error: OpenShift CLI (oc) not found. Please install it first."
    exit 1
fi

# Check if logged in to OpenShift
if ! oc whoami &> /dev/null; then
    echo "Error: Not logged in to OpenShift. Please run 'oc login' first."
    exit 1
fi

# Create new project or use existing
echo "Creating/using OpenShift project..."
oc new-project blake-marginalia || oc project blake-marginalia

# Process and create the template
echo "Processing OpenShift template..."
oc process -f openshift-template.yaml \
  -p APP_NAME="$APP_NAME" \
  -p GIT_URI="$GIT_URI" \
  | oc apply -f -

# Start the build
echo "Starting build..."
oc start-build "$APP_NAME"

# Wait for deployment
echo "Waiting for deployment to complete..."
oc rollout status dc/"$APP_NAME" --watch

# Get the route URL
ROUTE_URL=$(oc get route "$APP_NAME" -o jsonpath='{.spec.host}')
echo ""
echo "✅ Deployment complete!"
echo "🌐 Application URL: http://$ROUTE_URL"
echo ""
echo "To view logs: oc logs -f dc/$APP_NAME"
echo "To scale: oc scale dc/$APP_NAME --replicas=2"