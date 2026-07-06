#!/usr/bin/env python3
"""
Script de simulation NeoImmo : peuple la base avec des conditions "normales"
de fonctionnement pour des tests manuels répétés.

Ce script :
  1. Crée/actualise 5 clients (profil complet, wallet fixe, KYC vérifié FR).
  2. Crée 10 biens immobiliers avec l'ensemble des variables de rentabilité
     (acquisition, financement, loyers, charges, frais plateforme, sortie) —
     le score de chaque bien est calculé automatiquement par le backend.
  3. Déploie et mint chaque bien on-chain (signature EIP-712 admin simulée).
  4. Associe des parts de biens à des clients (achats primaires réels on-chain).
  5. Affiche l'échéancier de loyers admin (tous biens confondus) AVANT versement.
  6. Renseigne la fiche de versement mensuelle de chaque bien (loyer encaissé,
     occupation, charges réelles) puis déclenche le versement on-chain
     correspondant, pour générer des transactions RENT_PAYOUT.
  7. Réaffiche l'échéancier après versement (pour constater le passage à
     "versé") et affiche la tendance des ventes de tokens sur 6 mois.

Les wallets clients et le wallet de signature admin sont des clés privées
générées une fois puis codées EN DUR ci-dessous : relancer le script plusieurs
fois de suite réutilise toujours les mêmes adresses (utile pour retrouver les
mêmes comptes/wallets d'un test à l'autre sans reconfigurer MetaMask).

Dépendances : pip install -r requirements.txt (depuis la racine du repo)

Prérequis :
  - Stack Docker complète démarrée (`docker compose up -d --build`), y compris
    `chain` (Anvil) et `server` (backend) — pas seulement `database`.
  - Anvil ne persiste PAS son état : si le conteneur `chain` a été recréé
    depuis le dernier run de ce script, les biens déjà en base pointent vers
    des contrats qui n'existent plus (erreur "could not decode result data").
    Dans ce cas, vider la base d'abord avec `python3 vide_db.py --yes`.
  - Le port du backend (BACKEND_URL) dépend de SERVER_PORT dans le `.env` de la
    stack ciblée : 3000 en local par défaut, mais souvent différent sur un
    serveur distant (ex: 3001 sur le VPS de prod) — vérifier avec
    `cat .env | grep SERVER_PORT` avant de lancer, sinon le script échoue en
    "Connection refused".
  - Pour une démonstration complète du versement de loyer (fiche + paiement),
    le mois courant ne doit pas avoir déjà été versé pour les biens ciblés
    (la fiche refuse toute modification dès qu'un versement a eu lieu ce
    mois-ci). Sur une base déjà utilisée, repartir de zéro avec
    `python3 vide_db.py --yes` avant de relancer ce script.

Usage:
  BACKEND_URL=http://localhost:3000 ADMIN_EMAIL=admin@neoimmo.local ADMIN_PASSWORD=admin python3 test_bien_db.py
"""

import os
import sys
import time
import random
import requests
from eth_account import Account

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:3000").rstrip('/')
EMAIL = os.getenv("ADMIN_EMAIL", "admin@neoimmo.local")
PASSWORD = os.getenv("ADMIN_PASSWORD", "admin")

# ---------------------------------------------------------------------------
# Wallets codés en dur (générés une fois, réutilisables entre plusieurs runs).
# Ce sont de vrais wallets EOA (adresse + clé privée) contrôlés par ce script
# afin de pouvoir signer les approbations EIP-712 (déploiement admin, achats
# clients) sans passer par MetaMask.
# ---------------------------------------------------------------------------

ADMIN_DEPLOY_WALLET = {
    "address": "0xCe3444d34800879F58aAb7f15f91CbF27B000C96",
    "private_key": "0x87fb1507216198602b062b47784bda92a5da8e4ec5a069811601a1f42f94e461",
}

CLIENTS = [
    {
        "email": "client1.sim@neoimmo.local",
        "password": "Client123!",
        "firstName": "Lina",
        "lastName": "Martin",
        "address": "18 rue de la République",
        "postalCode": "69002",
        "city": "Lyon",
        "country": "France",
        "day": "09", "month": "07", "year": "1996",
        "birthPlace": "Lyon",
        "nationality": "Française",
        "number": "+33 6 12 34 56 78",
        "occupation": "Consultante",
        "taxResidence": "France",
        "annualIncomeRange": "50K_100K",
        "investmentObjective": "INCOME",
        "countryCode": "FR",
        "walletAddress": "0x9c09Eac715a6C82851E586BC3d23f99c1a697ab3",
        "privateKey": "0x8c8411d8a763a6683fbcdaada36b3fa16daa4d2759b6078cef7a6a9f83da2516",
    },
    {
        "email": "client2.sim@neoimmo.local",
        "password": "Client123!",
        "firstName": "Karim",
        "lastName": "Bensalah",
        "address": "5 avenue Foch",
        "postalCode": "75116",
        "city": "Paris",
        "country": "France",
        "day": "22", "month": "03", "year": "1988",
        "birthPlace": "Marseille",
        "nationality": "Française",
        "number": "+33 6 98 76 54 32",
        "occupation": "Ingénieur",
        "taxResidence": "France",
        "annualIncomeRange": "100K_250K",
        "investmentObjective": "GROWTH",
        "countryCode": "FR",
        "walletAddress": "0xafa52Aa58dFacb6e3151822FE038C1Ca809fC343",
        "privateKey": "0x1fba29bf65bd66502e99b322e77085820f4433c3ef2566e5703be962c682add5",
    },
    {
        "email": "client3.sim@neoimmo.local",
        "password": "Client123!",
        "firstName": "Chloé",
        "lastName": "Dubois",
        "address": "12 rue Sainte-Catherine",
        "postalCode": "33000",
        "city": "Bordeaux",
        "country": "France",
        "day": "14", "month": "11", "year": "1979",
        "birthPlace": "Bordeaux",
        "nationality": "Française",
        "number": "+33 6 11 22 33 44",
        "occupation": "Médecin",
        "taxResidence": "France",
        "annualIncomeRange": "OVER_250K",
        "investmentObjective": "DIVERSIFICATION",
        "countryCode": "FR",
        "walletAddress": "0xf0E0204ae384323722976120Ce62C6dB55081a1C",
        "privateKey": "0x364e7fd8490ccae3df6a884a938356666da226f97d6cdf94f7800d6383d3509b",
    },
    {
        "email": "client4.sim@neoimmo.local",
        "password": "Client123!",
        "firstName": "Thomas",
        "lastName": "Petit",
        "address": "3 place Stanislas",
        "postalCode": "54000",
        "city": "Nancy",
        "country": "France",
        "day": "02", "month": "01", "year": "2001",
        "birthPlace": "Nancy",
        "nationality": "Française",
        "number": "+33 6 55 44 33 22",
        "occupation": "Développeur",
        "taxResidence": "France",
        "annualIncomeRange": "25K_50K",
        "investmentObjective": "PROJECT",
        "countryCode": "FR",
        "walletAddress": "0x8758D6Ab7B3F729C1F7498a5D6c34Eb4CcFB2e36",
        "privateKey": "0x28746a52b0de2ff030fef7dbf5fb2123780c8435a0b193c6d83d27390028268a",
    },
    {
        "email": "client5.sim@neoimmo.local",
        "password": "Client123!",
        "firstName": "Isabelle",
        "lastName": "Moreau",
        "address": "27 quai des Chartrons",
        "postalCode": "44000",
        "city": "Nantes",
        "country": "France",
        "day": "30", "month": "06", "year": "1965",
        "birthPlace": "Nantes",
        "nationality": "Française",
        "number": "+33 6 77 88 99 00",
        "occupation": "Retraitée",
        "taxResidence": "France",
        "annualIncomeRange": "50K_100K",
        "investmentObjective": "RETIREMENT",
        "countryCode": "FR",
        "walletAddress": "0xF8415E34315AC13676Ffe97f844d4Ccc9A72d012",
        "privateKey": "0x2dae5d1edb4f6bfeb0c28cfd764acfff56e0b8b6dd9a216d815871993604316a",
    },
]

# Photos libres (Unsplash) utilisées pour illustrer les biens, sans enjeu de
# licence particulier pour un jeu de données de test.
PHOTO_POOL = [
    "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1460317442991-0ec209397118?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1523217582562-09d0def993a6?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
]


class Session:
    """Holds the admin JWT and transparently re-logs in when it expires.

    A Sepolia run can take well over an hour (real ~12s block times), long
    enough to outlive the 1h access token, so every call must be able to
    refresh and retry rather than crash the whole run.
    """

    def __init__(self):
        self._token = None
        self.refresh()

    def refresh(self):
        try:
            resp = requests.post(f"{BACKEND_URL}/auth/login", json={"email": EMAIL, "password": PASSWORD}, timeout=15)
        except requests.exceptions.ConnectionError as exc:
            print(f"Impossible de joindre {BACKEND_URL} : {exc}")
            print(
                "Vérifie que le backend tourne bien à cette adresse et sur ce port "
                "(BACKEND_URL, par défaut http://localhost:3000). Le port du backend "
                "est défini par SERVER_PORT dans le .env de la stack Docker cible : "
                "3000 en local par défaut, mais peut être différent sur un serveur "
                "distant (ex: 3001) — vérifie avec `cat .env | grep SERVER_PORT` et "
                "relance avec BACKEND_URL=http://localhost:<SERVER_PORT> python3 test_bien_db.py"
            )
            sys.exit(1)
        if resp.status_code != 200:
            print(f"Échec login ({resp.status_code}): {resp.text}")
            sys.exit(1)
        token = resp.json().get('accessToken')
        if not token:
            print('Access token introuvable dans la réponse de login')
            sys.exit(1)
        self._token = token

    def headers(self):
        return {"Authorization": f"Bearer {self._token}", "Content-Type": "application/json"}


def request_json(method, session, path, payload=None, ok_statuses=(200, 201), max_retries=3):
    # Sepolia calls that wait on tx confirmation (deploy/mint/execute/kyc-sync)
    # can legitimately take well over a minute under network congestion, so a
    # short client timeout would otherwise misread a slow-but-successful call
    # as failed and needlessly retry a non-idempotent endpoint.
    url = f"{BACKEND_URL}{path}"
    last_error = None

    for attempt in range(max_retries):
        try:
            resp = requests.request(method, url, json=payload, headers=session.headers(), timeout=180)

            if resp.status_code == 401:
                session.refresh()
                resp = requests.request(method, url, json=payload, headers=session.headers(), timeout=180)
        except requests.RequestException as error:
            last_error = error
            time.sleep(2 * (attempt + 1))
            continue

        if resp.status_code >= 500:
            last_error = RuntimeError(f"{method} {path} -> {resp.status_code}: {resp.text}")
            time.sleep(2 * (attempt + 1))
            continue

        if resp.status_code not in ok_statuses:
            raise RuntimeError(f"{method} {path} -> {resp.status_code}: {resp.text}")

        if resp.status_code == 204 or not resp.text:
            return None
        return resp.json()

    raise RuntimeError(f"{method} {path} a échoué après {max_retries} tentatives : {last_error}")


# ---------------------------------------------------------------------------
# Utilisateurs clients (profil complet + wallet fixe + KYC vérifié)
# ---------------------------------------------------------------------------

def upsert_client(session, spec):
    existing_users = request_json("GET", session, "/user")
    existing = next((u for u in existing_users if u["email"] == spec["email"]), None)

    profile_payload = {
        "email": spec["email"],
        "firstName": spec["firstName"],
        "lastName": spec["lastName"],
        "address": spec["address"],
        "postalCode": spec["postalCode"],
        "city": spec["city"],
        "country": spec["country"],
        "day": spec["day"],
        "month": spec["month"],
        "year": spec["year"],
        "birthPlace": spec["birthPlace"],
        "nationality": spec["nationality"],
        "number": spec["number"],
        "occupation": spec["occupation"],
        "taxResidence": spec["taxResidence"],
        "annualIncomeRange": spec["annualIncomeRange"],
        "investmentObjective": spec["investmentObjective"],
        "countryCode": spec["countryCode"],
        "walletAddress": spec["walletAddress"],
    }

    if existing:
        user = request_json("PUT", session, f"/user/{existing['id']}", profile_payload)
        print(f"  - {spec['email']}: profil mis à jour (id={user['id']})")
    else:
        create_payload = dict(profile_payload)
        create_payload["password"] = spec["password"]
        create_payload["role"] = "CLIENT"
        user = request_json("POST", session, "/user", create_payload)
        print(f"  - {spec['email']}: créé (id={user['id']})")

    if user.get("walletStatus") != "VERIFIED" or not user.get("kycSyncedAt"):
        request_json("POST", session, f"/crypto/users/{user['id']}/kyc/sync", {})
        print(f"    KYC synchronisé on-chain pour {spec['email']} (FR, vérifié).")
    else:
        print(f"    KYC déjà vérifié pour {spec['email']}.")

    return user


# ---------------------------------------------------------------------------
# Biens immobiliers
# ---------------------------------------------------------------------------

def sample_property(i):
    """Génère un bien avec toutes les variables de rentabilité du modèle
    financier (acquisition, financement, loyers, charges, frais plateforme,
    sortie), cohérentes entre elles, plutôt qu'un simple tokenNumber/tokenPrice
    arbitraire.
    """
    cities = ["Paris 13e", "Lyon 2e", "Marseille 6e", "Toulouse", "Bordeaux", "Lille", "Nice", "Nantes", "Strasbourg", "Montpellier"]
    kp_pool = ["Balcon", "Luminosité", "Proche métro", "Parking", "Ascenseur", "Rénové", "Calme", "Vue", "Piscine"]
    rent_types = ["Nue", "Meublée", "Saisonnière", "Coliving"]
    city = cities[(i - 1) % len(cities)]
    living = f"{random.randint(20, 150)}m2"
    rooms = random.randint(1, 5)
    baths = random.randint(1, 3)
    tokens = random.choice([10000, 50000, 100000, 200000])
    photos = random.sample(PHOTO_POOL, k=2)
    rent_type = random.choice(rent_types)

    # --- Acquisition (centimes) ---
    purchase_price = random.randint(150_000_00, 500_000_00)
    notary_fees_pct = round(random.uniform(7, 8), 2)
    agency_fees_pct = round(random.uniform(0, 5), 2)
    diagnostic_fees = random.randint(300_00, 800_00)
    renovation_cost = random.randint(0, 20_000_00)
    furniture_cost = random.randint(2_000_00, 8_000_00) if rent_type in ("Meublée", "Saisonnière", "Coliving") else 0

    # --- Financement : pas d'apport ni d'emprunt, 100% financé par les tokens ---
    platform_equity = 0
    loan_amount = 0
    loan_rate_pct = 0
    loan_duration_years = 0

    total_acquisition_cost = round(
        purchase_price * (1 + notary_fees_pct / 100 + agency_fees_pct / 100)
        + diagnostic_fees + renovation_cost + furniture_cost
    )
    token_price = max(100, round(total_acquisition_cost / tokens))

    # --- Revenus locatifs ---
    monthly_rent = round(purchase_price * random.uniform(0.0035, 0.006))
    occupancy_rate_pct = round(random.uniform(90, 100), 1)

    # --- Charges d'exploitation (annuelles, centimes) ---
    non_recoverable_charges = random.randint(60_000, 150_000)
    property_tax = random.randint(80_000, 200_000)
    insurance_pno_annual = random.randint(10_000, 25_000)
    insurance_gli_pct = round(random.uniform(2, 3.5), 2)
    management_fee_pct = round(random.uniform(6, 8), 2)
    maintenance_provision_pct = round(random.uniform(2, 4), 2)
    major_repairs_provision_pct = round(random.uniform(3, 6), 2)

    # --- Frais plateforme ---
    subscription_fee_pct = round(random.uniform(1, 3), 2)
    platform_annual_fee_pct = round(random.uniform(0.8, 1.5), 2)
    exit_fee_pct = round(random.uniform(1, 3), 2)
    rent_distribution_commission_pct = round(random.uniform(3, 6), 2)

    # --- Sortie / revente ---
    holding_period_years = random.randint(8, 12)
    exit_appreciation_pct = round(random.uniform(1, 3), 2)
    resale_fees_pct = round(random.uniform(5, 7), 2)

    return {
        "name": f"Bien Simulation {i} - {city}",
        "localization": city,
        "livingArea": living,
        "description": f"Bien de simulation pour test applicatif, situé à {city}.",
        "roomNumber": rooms,
        "bathroomNumber": baths,
        "tokenNumber": tokens,
        "tokenPrice": token_price,
        "purchasePrice": purchase_price,
        "notaryFeesPct": notary_fees_pct,
        "agencyFeesPct": agency_fees_pct,
        "diagnosticFees": diagnostic_fees,
        "renovationCost": renovation_cost,
        "furnitureCost": furniture_cost,
        "platformEquity": platform_equity,
        "loanAmount": loan_amount,
        "loanRatePct": loan_rate_pct,
        "loanDurationYears": loan_duration_years,
        "monthlyRent": monthly_rent,
        "occupancyRatePct": occupancy_rate_pct,
        "rentType": rent_type,
        "nonRecoverableCharges": non_recoverable_charges,
        "propertyTax": property_tax,
        "insurancePnoAnnual": insurance_pno_annual,
        "insuranceGliPct": insurance_gli_pct,
        "managementFeePct": management_fee_pct,
        "maintenanceProvisionPct": maintenance_provision_pct,
        "majorRepairsProvisionPct": major_repairs_provision_pct,
        "subscriptionFeePct": subscription_fee_pct,
        "platformAnnualFeePct": platform_annual_fee_pct,
        "exitFeePct": exit_fee_pct,
        "rentDistributionCommissionPct": rent_distribution_commission_pct,
        "holdingPeriodYears": holding_period_years,
        "exitAppreciationPct": exit_appreciation_pct,
        "resaleFeesPct": resale_fees_pct,
        "images": photos,
        "keyPoints": random.sample(kp_pool, k=min(3, len(kp_pool))),
    }


def format_eur(cents):
    return f"{(cents or 0) / 100:,.0f} €".replace(",", " ")


def print_property_financials(prop):
    financials = prop.get("financials")
    score = prop.get("score")

    if not financials:
        print(f"    Score : {score}/100 (pas de données financières)")
        return

    net_yield = financials.get("netYieldPct")
    cash_on_cash = financials.get("cashOnCashPct")
    monthly_income = financials.get("perTokenMonthlyIncome")

    print(
        f"    Score : {score}/100 · rendement net "
        f"{net_yield:.2f}% · cash-on-cash {cash_on_cash:.2f}% · "
        f"revenu/part/mois {format_eur(monthly_income)}"
    )


def upsert_property(session, payload):
    manageable = request_json("GET", session, "/property/manage")
    existing = next((p for p in manageable if p["name"] == payload["name"]), None)
    if existing:
        print(f"  - {payload['name']}: déjà présent (id={existing['id']})")
        print_property_financials(existing)
        return existing
    created = request_json("POST", session, "/property", payload)
    print(f"  - {payload['name']}: créé (id={created['id']})")
    print_property_financials(created)
    return created


# ---------------------------------------------------------------------------
# Déploiement, mint, achats on-chain (signatures EIP-712 locales)
# ---------------------------------------------------------------------------

def sign_typed(private_key, prepared):
    account = Account.from_key(private_key)
    signed = account.sign_typed_data(
        domain_data=prepared["domain"],
        message_types=prepared["types"],
        message_data=prepared["message"],
    )
    signature_hex = signed.signature.hex()
    return signature_hex if signature_hex.startswith("0x") else f"0x{signature_hex}"


def ensure_deployed_and_active(session, property_id, property_name):
    state = request_json("GET", session, f"/crypto/properties/{property_id}/state")
    status = state["property"]["tokenizationStatus"]

    if status == "DRAFT":
        prepared = request_json(
            "POST", session, f"/crypto/properties/{property_id}/deploy/prepare",
            {"adminWalletAddress": ADMIN_DEPLOY_WALLET["address"], "deadlineMinutes": 30},
        )
        signature = sign_typed(ADMIN_DEPLOY_WALLET["private_key"], prepared)
        try:
            request_json(
                "POST", session, f"/crypto/properties/{property_id}/deploy/execute",
                {"requestId": prepared["requestId"], "signature": signature},
            )
        except RuntimeError as error:
            if "deja ete executee" not in str(error):
                raise
        print(f"    {property_name}: déployé on-chain.")
        status = "DEPLOYED"

    if status == "DEPLOYED":
        request_json("POST", session, f"/crypto/properties/{property_id}/mint", {})
        print(f"    {property_name}: inventaire minté, bien actif.")
        status = "ACTIVE"

    if status == "PAUSED":
        request_json("POST", session, f"/crypto/properties/{property_id}/purchase-availability", {"available": True})
        status = "ACTIVE"

    return status == "ACTIVE"


def buy_shares(session, property_id, property_token_price, user, amount):
    prepared = request_json(
        "POST", session, "/crypto/marketplace/prepare-buy",
        {
            "propertyId": property_id,
            "userId": user["id"],
            "amount": str(amount),
            "price": str(property_token_price),
            "currency": "EUR",
            "deadlineMinutes": 30,
        },
    )
    signature = sign_typed(user["privateKey"], prepared)
    try:
        request_json(
            "POST", session, "/crypto/marketplace/execute",
            {"requestId": prepared["requestId"], "signature": signature},
        )
    except RuntimeError as error:
        # A client-side timeout on a slow Sepolia confirmation can make a call
        # that actually succeeded server-side look like it failed when we
        # retry it: the retry then correctly reports "already executed".
        # That means the purchase went through, so this isn't a real error.
        if "deja ete executee" not in str(error):
            raise


def build_rent_statement_payload(prop):
    """Dérive une fiche de versement mensuelle plausible à partir des
    hypothèses de rentabilité saisies sur le bien (monthlyRent, charges...).
    Le versement on-chain exige désormais qu'une fiche existe pour le mois
    ciblé avant de pouvoir distribuer les loyers.
    """
    monthly_rent = prop.get("monthlyRent") or 0
    occupancy_rate_pct = prop.get("occupancyRatePct")
    if occupancy_rate_pct is None:
        occupancy_rate_pct = 100

    non_recoverable_annual = prop.get("nonRecoverableCharges") or 0
    property_tax_annual = prop.get("propertyTax") or 0
    insurance_pno_annual = prop.get("insurancePnoAnnual") or 0
    insurance_gli_pct = prop.get("insuranceGliPct") or 0
    management_fee_pct = prop.get("managementFeePct") or 0
    maintenance_provision_pct = prop.get("maintenanceProvisionPct") or 0
    rent_distribution_commission_pct = prop.get("rentDistributionCommissionPct") or 0

    return {
        "rentCollected": monthly_rent,
        "occupancyRatePct": occupancy_rate_pct,
        "nonRecoverableCharges": round(non_recoverable_annual / 12),
        "propertyTaxMonthly": round(property_tax_annual / 12),
        "insuranceCosts": round(insurance_pno_annual / 12 + monthly_rent * insurance_gli_pct / 100),
        "managementFee": round(monthly_rent * management_fee_pct / 100),
        "maintenanceCost": round(monthly_rent * maintenance_provision_pct / 100),
        "blockchainFees": 500,
        "platformFee": round(monthly_rent * rent_distribution_commission_pct / 100),
        "notes": "Fiche générée automatiquement par test_bien_db.py",
    }


def submit_rent_statement(session, property_id, prop, month_start):
    payload = build_rent_statement_payload(prop)
    try:
        return request_json(
            "POST", session, f"/crypto/properties/{property_id}/rent-management/{month_start}/statement",
            payload,
        )
    except RuntimeError as error:
        print(f"    Fiche de versement impossible: {error}")
        return None


def pay_current_month_rent(session, property_id, prop):
    from datetime import datetime, timezone
    month_start = datetime.now(timezone.utc).replace(day=1).strftime("%Y-%m-%d")

    statement = submit_rent_statement(session, property_id, prop, month_start)
    if not statement:
        return None

    try:
        result = request_json(
            "POST", session, f"/crypto/properties/{property_id}/rent-management/pay",
            {"month": month_start},
        )
        return result
    except RuntimeError as error:
        print(f"    Versement de loyer ignoré: {error}")
        return None


def print_rent_calendar(session, months_ahead=6):
    """Affiche l'échéancier admin (tous biens confondus) sur les prochains
    mois — la même donnée que le widget calendrier de l'overview admin.
    """
    calendar = request_json(
        "GET", session, f"/portfolio/admin/rent-calendar?monthsAhead={months_ahead}",
    )

    for month in calendar["months"]:
        remaining = month["totalProjected"] - month["totalPaid"]
        status = "versé" if remaining <= 0 and month["totalProjected"] > 0 else "à verser"
        print(
            f"  - {month['label']}: {format_eur(month['totalProjected'])} projeté, "
            f"{format_eur(month['totalPaid'])} versé "
            f"({status}, {len(month['properties'])} bien(s))"
        )


def print_sales_series(session, months_back=6):
    """Affiche la tendance des ventes de tokens sur les derniers mois — la
    même donnée que le graphe de ventes de l'overview admin.
    """
    series = request_json(
        "GET", session, f"/crypto/system/sales-series?monthsBack={months_back}",
    )

    for month in series["months"]:
        print(
            f"  - {month['label']}: {format_eur(month['amountRaised'])} levés, "
            f"{month['tokensSold']} tokens vendus, {month['salesCount']} transaction(s)"
        )


def main():
    print(f"Connexion à {BACKEND_URL} avec {EMAIL}")
    session = Session()
    print("Login OK, token obtenu.\n")

    print("=== Clients (profil complet, wallet fixe, KYC vérifié FR) ===")
    clients = []
    for spec in CLIENTS:
        user = upsert_client(session, spec)
        user["privateKey"] = spec["privateKey"]
        clients.append(user)
        time.sleep(0.1)

    print("\n=== Biens immobiliers (avec photos) ===")
    properties = []
    for i in range(1, 11):
        payload = sample_property(i)
        prop = upsert_property(session, payload)
        properties.append(prop)
        time.sleep(0.1)

    print("\n=== Déploiement / mint on-chain ===")
    active_properties = []
    for prop in properties:
        try:
            if ensure_deployed_and_active(session, prop["id"], prop["name"]):
                active_properties.append(prop)
        except RuntimeError as error:
            print(f"  ERREUR déploiement {prop['name']}: {error}")
        time.sleep(0.2)

    print("\n=== Association de parts aux clients (achats primaires) ===")
    purchases = 0
    for prop in active_properties:
        state = request_json("GET", session, f"/crypto/properties/{prop['id']}/state")
        token_price = state["property"]["tokenPrice"]
        token_number = state["property"]["tokenNumber"]
        buyers = random.sample(clients, k=random.randint(2, min(4, len(clients))))

        for client in buyers:
            amount = max(1, round(token_number * random.uniform(0.01, 0.05)))
            try:
                buy_shares(session, prop["id"], token_price, client, amount)
                print(f"  - {client['email']} achète {amount} parts de {prop['name']}")
                purchases += 1
            except RuntimeError as error:
                print(f"  ERREUR achat {client['email']} / {prop['name']}: {error}")
            time.sleep(0.2)

    print("\n=== Échéancier de loyers admin — AVANT versement ===")
    print_rent_calendar(session)

    print("\n=== Versement de loyer du mois courant (fiche + transactions RENT_PAYOUT) ===")
    for prop in active_properties:
        result = pay_current_month_rent(session, prop["id"], prop)
        if result:
            print(f"  - {prop['name']}: {result['paid']} versement(s), {result['failed']} échec(s), {result['skipped']} ignoré(s)")
        time.sleep(0.2)

    print("\n=== Échéancier de loyers admin — APRÈS versement ===")
    print_rent_calendar(session)

    print("\n=== Tendance des ventes de tokens (6 derniers mois) ===")
    print_sales_series(session)

    print("\n=== Résumé ===")
    print(f"Clients prêts : {len(clients)}")
    print(f"Biens créés/présents : {len(properties)} (actifs on-chain: {len(active_properties)})")
    print(f"Achats exécutés : {purchases}")
    print("\nWallets clients réutilisables :")
    for spec in CLIENTS:
        print(f"  - {spec['email']}: {spec['walletAddress']}")
    print(f"Wallet admin de déploiement : {ADMIN_DEPLOY_WALLET['address']}")


if __name__ == '__main__':
    main()
