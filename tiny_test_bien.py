#!/usr/bin/env python3
"""
Version allégée de test_bien_db.py : 2 clients, 2 biens, un tour d'achats et
un versement de loyer. Sert à valider rapidement (et à moindre coût réel de
gas/ETH) tout le pipeline sur un réseau réel comme Sepolia avant de lancer le
script complet à 10 biens.

Réutilise directement les fonctions de test_bien_db.py (aucune logique
dupliquée) — seule la volumétrie change.

Usage:
  BACKEND_URL=http://localhost:3000 ADMIN_EMAIL=admin@neoimmo.local ADMIN_PASSWORD=admin python3 tiny_test_bien.py
"""

import time
import random

import test_bien_db as base


def main():
    print(f"Connexion à {base.BACKEND_URL} avec {base.EMAIL}")
    session = base.Session()
    print("Login OK, token obtenu.\n")

    tiny_clients_specs = base.CLIENTS[:2]
    tiny_property_count = 2

    print("=== Clients (2 seulement) ===")
    clients = []
    for spec in tiny_clients_specs:
        user = base.upsert_client(session, spec)
        user["privateKey"] = spec["privateKey"]
        clients.append(user)
        time.sleep(0.1)

    print("\n=== Biens immobiliers (2 seulement) ===")
    properties = []
    for i in range(1, tiny_property_count + 1):
        payload = base.sample_property(i)
        prop = base.upsert_property(session, payload)
        properties.append(prop)
        time.sleep(0.1)

    print("\n=== Déploiement / mint on-chain ===")
    active_properties = []
    for prop in properties:
        try:
            if base.ensure_deployed_and_active(session, prop["id"], prop["name"]):
                active_properties.append(prop)
        except RuntimeError as error:
            print(f"  ERREUR déploiement {prop['name']}: {error}")
        time.sleep(0.2)

    print("\n=== Association de parts aux clients (achats primaires) ===")
    purchases = 0
    for prop in active_properties:
        state = base.request_json(
            "GET", session, f"/crypto/properties/{prop['id']}/state",
        )
        token_price = state["property"]["tokenPrice"]
        token_number = state["property"]["tokenNumber"]

        for client in clients:
            amount = max(1, round(token_number * random.uniform(0.01, 0.03)))
            try:
                base.buy_shares(session, prop["id"], token_price, client, amount)
                print(f"  - {client['email']} achète {amount} parts de {prop['name']}")
                purchases += 1
            except RuntimeError as error:
                print(f"  ERREUR achat {client['email']} / {prop['name']}: {error}")
            time.sleep(0.2)

    print("\n=== Échéancier de loyers admin — AVANT versement ===")
    base.print_rent_calendar(session)

    print("\n=== Versement de loyer du mois courant (fiche + transactions RENT_PAYOUT) ===")
    for prop in active_properties:
        result = base.pay_current_month_rent(session, prop["id"], prop)
        if result:
            print(f"  - {prop['name']}: {result['paid']} versement(s), {result['failed']} échec(s), {result['skipped']} ignoré(s)")
        time.sleep(0.2)

    print("\n=== Échéancier de loyers admin — APRÈS versement ===")
    base.print_rent_calendar(session)

    print("\n=== Tendance des ventes de tokens (6 derniers mois) ===")
    base.print_sales_series(session)

    print("\n=== Résumé ===")
    print(f"Clients prêts : {len(clients)}")
    print(f"Biens créés/présents : {len(properties)} (actifs on-chain: {len(active_properties)})")
    print(f"Achats exécutés : {purchases}")


if __name__ == '__main__':
    main()
