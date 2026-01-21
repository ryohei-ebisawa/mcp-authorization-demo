#!/bin/bash

# mkcert で生成した証明書を使用して、HTTPS通信を可能にします
# export NODE_EXTRA_CA_CERTS="$(mkcert -CAROOT)/rootCA.pem"

# npx concurrently を使用して、両方のログを識別可能な状態で並列表示します
# --kill-others: 片方のプロセスが終了または停止した場合、もう片方も自動的に停止させます
# --prefix "[{name}]": ログの先頭にプロセス名を表示します
# --names: 各プロセスに名前を付けます
# --prefix-colors: ラベルの色を指定します
npx concurrently \
  --kill-others \
  --prefix "[{name}]" \
  --names "APP,INSPECT" \
  --prefix-colors "cyan,magenta" \
  "npm run dev"