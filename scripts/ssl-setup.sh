#!/bin/bash

CERT_DIR="ssl"
HOSTNAME="localhost"

echo "SSL証明書を生成中..."
echo ""

# sslディレクトリが存在しない場合は作成
if [ ! -d "$CERT_DIR" ]; then
    mkdir -p "$CERT_DIR"
fi

cd $CERT_DIR
mkcert $HOSTNAME

echo ""
echo "✅ SSL証明書が正常に生成されました！"