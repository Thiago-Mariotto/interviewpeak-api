#!/bin/bash

# Variáveis do seu cenário
USER_ID="09125899-46fb-420f-9502-1df54ffeb23d"
PRICE_ID="price_1RPEscGXf0T0nDP3QfIOQdlY"
PRODUCT_ID="bf54232e-c721-4b2e-bfec-c8c6ecfd060f"
QUANTITY="1"
AMOUNT="2990"  # Ajuste conforme o valor real do seu produto

echo "🧪 Iniciando simulação de checkout completo..."
echo "📋 Parâmetros:"
echo "   User ID: $USER_ID"
echo "   Price ID: $PRICE_ID" 
echo "   Product ID: $PRODUCT_ID"
echo "   Quantity: $QUANTITY"
echo ""

# 1. Simular checkout.session.completed
echo "1️⃣ Simulando checkout.session.completed..."
stripe trigger checkout.session.completed \
  --add checkout.session:metadata[userId]=$USER_ID \
  --add checkout.session:metadata[priceId]=$PRICE_ID \
  --add checkout.session:metadata[productId]=$PRODUCT_ID \
  --add checkout.session:metadata[quantity]=$QUANTITY \
  --add checkout.session:mode=payment \
  --add checkout.session:payment_status=paid \
  --add checkout.session:amount_total=$AMOUNT

echo "✅ Checkout session completed enviado!"
echo ""

# Aguardar um pouco
sleep 2

# 2. Simular payment_intent.succeeded
echo "2️⃣ Simulando payment_intent.succeeded..."
stripe trigger payment_intent.succeeded \
  --add payment_intent:metadata[userId]=$USER_ID \
  --add payment_intent:metadata[priceId]=$PRICE_ID \
  --add payment_intent:metadata[productId]=$PRODUCT_ID \
  --add payment_intent:amount=$AMOUNT \
  --add payment_intent:currency=brl

echo "✅ Payment intent succeeded enviado!"
echo ""

# Aguardar um pouco
sleep 2

# 3. Simular invoice.payment_succeeded (caso use subscriptions ou invoices)
echo "3️⃣ Simulando invoice.payment_succeeded..."
stripe trigger invoice.payment_succeeded \
  --add invoice:metadata[userId]=$USER_ID \
  --add invoice:metadata[priceId]=$PRICE_ID \
  --add invoice:metadata[productId]=$PRODUCT_ID \
  --add invoice:amount_paid=$AMOUNT

echo "✅ Invoice payment succeeded enviado!"
echo ""

echo "🎉 Simulação completa! Verifique os webhooks no seu terminal."
echo "📊 Eventos enviados:"
echo "   - checkout.session.completed"
echo "   - payment_intent.succeeded" 
echo "   - invoice.payment_succeeded"