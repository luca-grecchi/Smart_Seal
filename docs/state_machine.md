# Smart Seal State Machine

```txt
SEALED
  -> IN_TRANSIT
  -> DELIVERED_AWAITING_RECIPIENT
      -> DELIVERED_CONFIRMED
          -> OPENED_BY_CUSTOMER
          -> REMOVED_BY_CUSTOMER
          -> VERDICT_A
          -> VERDICT_D se arriva dispute EMPTY_BOX dopo PRODUCT_REMOVED
      -> OPENED_WITHOUT_AUTH
          -> VERDICT_B se courier_gps != client_home
          -> VERDICT_C se gap consegna-apertura >= 5s
```

## Regole verdict

- `VERDICT_A`: client autenticato e `PRODUCT_REMOVED` registrato.
- `VERDICT_B`: apertura senza client auth e GPS corriere diverso da `client_home`.
- `VERDICT_C`: apertura senza client auth dopo almeno 5 secondi dalla consegna a `client_home`.
- `VERDICT_D`: disputa `EMPTY_BOX` dopo lock irreversibile `PRODUCT_REMOVED`.

## Logic lock

`productRemovedLock` diventa `true` al primo evento `PRODUCT_REMOVED` e non torna `false` nella stessa sessione.

