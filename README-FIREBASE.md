# Krona + Firebase

## Arquivos
- index.html
- index.css
- index.js
- firebase.js
- auth.html
- auth.css
- auth.js
- firestore.rules
- manifest.json

## Estrutura Firestore
users/{uid}
users/{uid}/accounts/{accountId}
users/{uid}/categories/{categoryId}
users/{uid}/transactions/{transactionId}

## Firebase Authentication
Ative:
- Email/senha
- Google

## Firestore
Use as regras do arquivo firestore.rules.

## Importante
O Firebase config usado no frontend não é uma senha. A proteção real dos dados é feita pelas Security Rules e pelo Firebase Authentication.

O app precisa ser servido por HTTP/HTTPS, não aberto diretamente como file://.
