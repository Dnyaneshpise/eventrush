#!/bin/bash
# Runs the EventRush JMeter load test and generates an HTML dashboard
# report you can open in a browser and screenshot for your portfolio.
#
# PREREQUISITES:
#   1. JMeter installed (5.6+ recommended): https://jmeter.apache.org/download_jmeter.cgi
#      (unzip it, add its bin/ folder to your PATH, or just cd into it)
#   2. Your EventRush backend running on localhost:8080
#      (single instance is fine, or the distributed docker-compose setup)
#   3. seed_load_test_data.sql already run against your MySQL database

set -e

cd "$(dirname "$0")"

rm -f results.jtl
rm -rf report

echo "Running load test (this will take 1-3 minutes)..."
jmeter -n -t eventrush_load_test.jmx -l results.jtl

echo ""
echo "Generating HTML dashboard..."
jmeter -g results.jtl -o report

echo ""
echo "Done. Open report/index.html in a browser to see:"
echo "  - Requests/sec (your throughput number)"
echo "  - Response time percentiles (p50, p90, p99)"
echo "  - Error rate breakdown by HTTP status code"
echo ""
echo "Also check results.jtl directly, or run:"
echo "  grep -c ',201,' results.jtl   # count of successful bookings"
echo "  grep -c ',409,' results.jtl   # count of seat-conflict rejections"
echo "  grep -c ',429,' results.jtl   # count of rate-limited requests"
