#!/bin/bash

# Script de pruebas para el sistema Event-Driven
# Ejecutar: bash test-api.sh

echo "════════════════════════════════════════════════════════════"
echo "  SCRIPT DE PRUEBAS - SISTEMA EVENT-DRIVEN MICROSERVICES"
echo "════════════════════════════════════════════════════════════"
echo ""

API_URL="http://localhost:3000"

# Colores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Función para imprimir con color
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Verificar que curl está instalado
if ! command -v curl &> /dev/null; then
    print_error "curl no está instalado. Por favor instálalo primero."
    exit 1
fi

# Verificar que jq está instalado (opcional, para pretty print)
if ! command -v jq &> /dev/null; then
    print_warning "jq no está instalado. Instálalo para mejor formato de JSON."
    USE_JQ=false
else
    USE_JQ=true
fi

# Función para hacer request y mostrar resultado
make_request() {
    local method=$1
    local endpoint=$2
    local data=$3
    local description=$4

    echo ""
    echo "────────────────────────────────────────────────────────────"
    print_info "$description"
    echo "────────────────────────────────────────────────────────────"
    echo "Endpoint: $method $endpoint"
    
    if [ ! -z "$data" ]; then
        echo "Datos: $data"
    fi
    
    echo ""
    
    if [ -z "$data" ]; then
        response=$(curl -s -X $method "$API_URL$endpoint")
    else
        response=$(curl -s -X $method "$API_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data")
    fi
    
    if [ $? -eq 0 ]; then
        print_success "Request exitoso"
        echo "Respuesta:"
        if [ "$USE_JQ" = true ]; then
            echo "$response" | jq '.'
        else
            echo "$response"
        fi
    else
        print_error "Request falló"
    fi
    
    echo ""
    sleep 2
}

# Test 1: Health Check
print_info "═══════════════════════════════════════════════════════════"
print_info "TEST 1: Verificando estado de la API"
print_info "═══════════════════════════════════════════════════════════"
make_request "GET" "/health" "" "Health Check del sistema"

# Test 2: Información de la API
make_request "GET" "/" "" "Información general de la API"

# Test 3: Crear Orden Simple
print_info "═══════════════════════════════════════════════════════════"
print_info "TEST 2: Crear orden de laptop"
print_info "═══════════════════════════════════════════════════════════"
make_request "POST" "/orders" '{
  "userId": "user123",
  "productId": "laptop-pro",
  "quantity": 2,
  "totalAmount": 2999.98
}' "Creando orden de 2 laptops"

print_warning "Espera 5 segundos para ver los logs de los servicios procesando..."
sleep 5

# Test 4: Crear Orden de Phone
print_info "═══════════════════════════════════════════════════════════"
print_info "TEST 3: Crear orden de teléfono"
print_info "═══════════════════════════════════════════════════════════"
make_request "POST" "/orders" '{
  "userId": "user456",
  "productId": "phone-x",
  "quantity": 1,
  "totalAmount": 999.99
}' "Creando orden de 1 teléfono"

print_warning "Espera 5 segundos para ver los logs de los servicios procesando..."
sleep 5

# Test 5: Crear Orden de Tablet
print_info "═══════════════════════════════════════════════════════════"
print_info "TEST 4: Crear orden de tablet"
print_info "═══════════════════════════════════════════════════════════"
make_request "POST" "/orders" '{
  "userId": "user789",
  "productId": "tablet-s",
  "quantity": 3,
  "totalAmount": 1499.97
}' "Creando orden de 3 tablets"

print_warning "Espera 5 segundos para ver los logs de los servicios procesando..."
sleep 5

# Test 6: Procesar Pago
print_info "═══════════════════════════════════════════════════════════"
print_info "TEST 5: Procesar pago"
print_info "═══════════════════════════════════════════════════════════"
make_request "POST" "/orders/ORD-123456/payment" '{
  "paymentMethod": "credit_card",
  "amount": 2999.98
}' "Procesando pago con tarjeta de crédito"

print_warning "Espera 5 segundos para ver los logs de los servicios procesando..."
sleep 5

# Test 7: Enviar Orden
print_info "═══════════════════════════════════════════════════════════"
print_info "TEST 6: Enviar orden"
print_info "═══════════════════════════════════════════════════════════"
make_request "POST" "/orders/ORD-123456/shipment" '{
  "address": "Calle 123 #45-67, Palmira, Valle del Cauca",
  "carrier": "DHL"
}' "Enviando orden con DHL"

print_warning "Espera 5 segundos para ver los logs de los servicios procesando..."
sleep 5

# Test 8: Request inválido
print_info "═══════════════════════════════════════════════════════════"
print_info "TEST 7: Validación de datos (debe fallar)"
print_info "═══════════════════════════════════════════════════════════"
make_request "POST" "/orders" '{
  "userId": "user999"
}' "Intentando crear orden sin campos requeridos (debe fallar)"

echo ""
echo "════════════════════════════════════════════════════════════"
print_success "PRUEBAS COMPLETADAS"
echo "════════════════════════════════════════════════════════════"
echo ""
print_info "Revisa los logs de Docker Compose para ver el procesamiento:"
echo "  $ docker-compose logs -f"
echo ""
print_info "Accede a RabbitMQ Management UI:"
echo "  http://localhost:15672 (usuario: guest, password: guest)"
echo ""
print_info "Para más pruebas manuales, usa Postman o curl:"
echo "  curl -X POST http://localhost:3000/orders \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"userId\":\"test\",\"productId\":\"prod1\",\"quantity\":1,\"totalAmount\":100}'"
echo ""
echo "════════════════════════════════════════════════════════════"