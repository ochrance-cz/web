#!/usr/bin/env bash
# One-off setup of the domekpolopate.cz zone for both sites, with the cf CLI.
# Safe to rerun: existing records and hostnames are left alone.
#
#   cf auth create ochrance                      # once, with the login that sees the zone
#   cloudflare/setup-zone.sh                     # apply
#   CF_DRY_RUN=1 cloudflare/setup-zone.sh        # only show the requests
#
# At the end it prints the DNS records the ochrance.cz administrator has to add
# before the cutover.
set -euo pipefail

ZONE=domekpolopate.cz
FALLBACK=fallback.$ZONE
HOSTNAMES=(www.ochrance.cz deti.ochrance.cz)
PROFILE=${CF_PROFILE:-ochrance}
DRY=()
[ -n "${CF_DRY_RUN:-}" ] && DRY=(--dry-run)

cfz() { cf --profile "$PROFILE" -z "$ZONE" "$@"; }

echo "1/5 Fallback origin record $FALLBACK (AAAA 100::, proxied)"
if [ "$(cfz dns records list --name "$FALLBACK" --type AAAA | jq 'length')" = 0 ]; then
  cfz dns records create "${DRY[@]}" --body "$(jq -nc --arg name "$FALLBACK" \
    '{type: "AAAA", name: $name, content: "100::", proxied: true, ttl: 1,
      comment: "Fallback origin of the custom hostnames; served by Workers"}')"
fi

echo "2/5 Fallback origin for custom hostnames"
cfz custom-hostnames fallback-origin update "${DRY[@]}" --origin "$FALLBACK"

echo "3/5 Custom hostnames"
for host in "${HOSTNAMES[@]}"; do
  if [ "$(cfz custom-hostnames list --hostname "$host" | jq 'length')" = 0 ]; then
    cfz custom-hostnames create "${DRY[@]}" --body "$(jq -nc --arg host "$host" \
      '{hostname: $host, ssl: {method: "txt", type: "dv", settings: {min_tls_version: "1.2"}}}')"
  fi
done

echo "4/5 Zone settings"
cfz zones settings edit always_use_https "${DRY[@]}" --body '{"value":"on"}'
cfz zones settings edit min_tls_version "${DRY[@]}" --body '{"value":"1.2"}'
# Would rewrite every e-mail address on the pages into JavaScript.
cfz zones settings edit email_obfuscation "${DRY[@]}" --body '{"value":"off"}'
cfz zones settings edit rocket_loader "${DRY[@]}" --body '{"value":"off"}'
# Bot Fight Mode would challenge RSS readers and other legitimate clients. The
# update call replaces the whole bot configuration, so it is only checked here.
if [ "$(cfz bot-management get | jq '.fight_mode')" != false ]; then
  echo "  Bot Fight Mode is on: turn it off in Security → Bots." >&2
fi

echo "5/5 DNS records for ochrance.cz (send to its administrator)"
dcv=$(cfz dcv-delegation get | jq -r '.uuid')
for host in "${HOSTNAMES[@]}"; do
  cfz custom-hostnames list --hostname "$host" | jq -r --arg dcv "$dcv" '.[0] |
    "\(.ownership_verification.name)  TXT    \(.ownership_verification.value)",
    "_acme-challenge.\(.hostname)  CNAME  \(.hostname).\($dcv).dcv.cloudflare.com",
    "  status: hostname \(.status), certificate \(.ssl.status)"'
done
echo "At cutover: www and deti A+AAAA → CNAME $FALLBACK"
