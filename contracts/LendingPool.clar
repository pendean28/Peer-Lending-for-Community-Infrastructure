(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-INVALID-PROPOSAL-ID u101)
(define-constant ERR-INVALID-AMOUNT u102)
(define-constant ERR-POOL-ALREADY-EXISTS u103)
(define-constant ERR-POOL-NOT-FOUND u104)
(define-constant ERR-INSUFFICIENT-FUNDS u105)
(define-constant ERR-INVALID-STATUS u106)
(define-constant ERR-INVALID-TIMESTAMP u107)
(define-constant ERR-AUTHORITY-NOT-VERIFIED u108)
(define-constant ERR-INVALID-MIN-CONTRIB u109)
(define-constant ERR-INVALID-MAX-FUND u110)
(define-constant ERR-POOL-UPDATE-NOT-ALLOWED u111)
(define-constant ERR-INVALID-UPDATE-PARAM u112)
(define-constant ERR-MAX-POOLS-EXCEEDED u113)
(define-constant ERR-INVALID-POOL-TYPE u114)
(define-constant ERR-INVALID-INTEREST-RATE u115)
(define-constant ERR-INVALID-DEADLINE u116)
(define-constant ERR-INVALID-LOCATION u117)
(define-constant ERR-INVALID-CURRENCY u118)
(define-constant ERR-TRANSFER-FAILED u119)
(define-constant ERR-INVALID-LENDER u120)
(define-constant ERR-POOL-CLOSED u121)
(define-constant ERR-INVALID-WITHDRAW-AMOUNT u122)
(define-constant ERR-INVALID-REPAYMENT-RATE u123)
(define-constant ERR-INVALID-GOV-THRESHOLD u124)
(define-data-var next-pool-id uint u0)
(define-data-var max-pools uint u500)
(define-data-var creation-fee uint u500)
(define-data-var authority-contract (optional principal) none)
(define-map pools
  uint
  {
    proposal-id: uint,
    total-funds: uint,
    min-contrib: uint,
    max-fund: uint,
    deadline: uint,
    interest-rate: uint,
    status: bool,
    creator: principal,
    pool-type: (string-utf8 50),
    location: (string-utf8 100),
    currency: (string-utf8 20),
    timestamp: uint,
    repayment-rate: uint,
    gov-threshold: uint
  }
)
(define-map pools-by-proposal
  uint
  uint)
(define-map lender-contributions
  { pool-id: uint, lender: principal }
  uint)
(define-map pool-updates
  uint
  {
    update-min-contrib: uint,
    update-max-fund: uint,
    update-deadline: uint,
    update-timestamp: uint,
    updater: principal
  }
)
(define-read-only (get-pool (id uint))
  (map-get? pools id)
)
(define-read-only (get-pool-updates (id uint))
  (map-get? pool-updates id)
)
(define-read-only (get-lender-contribution (pool-id uint) (lender principal))
  (default-to u0 (map-get? lender-contributions { pool-id: pool-id, lender: lender }))
)
(define-read-only (is-pool-registered (proposal-id uint))
  (is-some (map-get? pools-by-proposal proposal-id))
)
(define-private (validate-proposal-id (id uint))
  (if (> id u0)
      (ok true)
      (err ERR-INVALID-PROPOSAL-ID))
)
(define-private (validate-amount (amount uint))
  (if (> amount u0)
      (ok true)
      (err ERR-INVALID-AMOUNT))
)
(define-private (validate-min-contrib (min uint))
  (if (> min u0)
      (ok true)
      (err ERR-INVALID-MIN-CONTRIB))
)
(define-private (validate-max-fund (max uint))
  (if (> max u0)
      (ok true)
      (err ERR-INVALID-MAX-FUND))
)
(define-private (validate-deadline (dl uint))
  (if (> dl block-height)
      (ok true)
      (err ERR-INVALID-DEADLINE))
)
(define-private (validate-interest-rate (rate uint))
  (if (<= rate u15)
      (ok true)
      (err ERR-INVALID-INTEREST-RATE))
)
(define-private (validate-pool-type (type (string-utf8 50)))
  (if (or (is-eq type "infrastructure") (is-eq type "community") (is-eq type "water"))
      (ok true)
      (err ERR-INVALID-POOL-TYPE))
)
(define-private (validate-location (loc (string-utf8 100)))
  (if (and (> (len loc) u0) (<= (len loc) u100))
      (ok true)
      (err ERR-INVALID-LOCATION))
)
(define-private (validate-currency (cur (string-utf8 20)))
  (if (or (is-eq cur "STX") (is-eq cur "SIP10"))
      (ok true)
      (err ERR-INVALID-CURRENCY))
)
(define-private (validate-repayment-rate (rate uint))
  (if (<= rate u100)
      (ok true)
      (err ERR-INVALID-REPAYMENT-RATE))
)
(define-private (validate-gov-threshold (threshold uint))
  (if (and (> threshold u0) (<= threshold u100))
      (ok true)
      (err ERR-INVALID-GOV-THRESHOLD))
)
(define-private (validate-principal (p principal))
  (if (not (is-eq p 'SP000000000000000000002Q6VF78))
      (ok true)
      (err ERR-NOT-AUTHORIZED))
)
(define-public (set-authority-contract (contract-principal principal))
  (begin
    (try! (validate-principal contract-principal))
    (asserts! (is-none (var-get authority-contract)) (err ERR-AUTHORITY-NOT-VERIFIED))
    (var-set authority-contract (some contract-principal))
    (ok true)
  )
)
(define-public (set-max-pools (new-max uint))
  (begin
    (asserts! (> new-max u0) (err ERR-INVALID-UPDATE-PARAM))
    (asserts! (is-some (var-get authority-contract)) (err ERR-AUTHORITY-NOT-VERIFIED))
    (var-set max-pools new-max)
    (ok true)
  )
)
(define-public (set-creation-fee (new-fee uint))
  (begin
    (asserts! (>= new-fee u0) (err ERR-INVALID-UPDATE-PARAM))
    (asserts! (is-some (var-get authority-contract)) (err ERR-AUTHORITY-NOT-VERIFIED))
    (var-set creation-fee new-fee)
    (ok true)
  )
)
(define-public (create-pool
  (proposal-id uint)
  (min-contrib uint)
  (max-fund uint)
  (deadline uint)
  (interest-rate uint)
  (pool-type (string-utf8 50))
  (location (string-utf8 100))
  (currency (string-utf8 20))
  (repayment-rate uint)
  (gov-threshold uint)
)
  (let (
        (next-id (var-get next-pool-id))
        (current-max (var-get max-pools))
        (authority (var-get authority-contract))
      )
    (asserts! (< next-id current-max) (err ERR-MAX-POOLS-EXCEEDED))
    (try! (validate-proposal-id proposal-id))
    (try! (validate-min-contrib min-contrib))
    (try! (validate-max-fund max-fund))
    (try! (validate-deadline deadline))
    (try! (validate-interest-rate interest-rate))
    (try! (validate-pool-type pool-type))
    (try! (validate-location location))
    (try! (validate-currency currency))
    (try! (validate-repayment-rate repayment-rate))
    (try! (validate-gov-threshold gov-threshold))
    (asserts! (is-none (map-get? pools-by-proposal proposal-id)) (err ERR-POOL-ALREADY-EXISTS))
    (let ((authority-recipient (unwrap! authority (err ERR-AUTHORITY-NOT-VERIFIED))))
      (try! (stx-transfer? (var-get creation-fee) tx-sender authority-recipient))
    )
    (map-set pools next-id
      {
        proposal-id: proposal-id,
        total-funds: u0,
        min-contrib: min-contrib,
        max-fund: max-fund,
        deadline: deadline,
        interest-rate: interest-rate,
        status: true,
        creator: tx-sender,
        pool-type: pool-type,
        location: location,
        currency: currency,
        timestamp: block-height,
        repayment-rate: repayment-rate,
        gov-threshold: gov-threshold
      }
    )
    (map-set pools-by-proposal proposal-id next-id)
    (var-set next-pool-id (+ next-id u1))
    (print { event: "pool-created", id: next-id })
    (ok next-id)
  )
)
(define-public (lend-to-pool (pool-id uint) (amount uint))
  (let ((pool (map-get? pools pool-id)))
    (match pool
      p
        (begin
          (asserts! (get status p) (err ERR-POOL-CLOSED))
          (asserts! (>= amount (get min-contrib p)) (err ERR-INVALID-AMOUNT))
          (asserts! (<= (+ (get total-funds p) amount) (get max-fund p)) (err ERR-INVALID-MAX-FUND))
          (asserts! (<= block-height (get deadline p)) (err ERR-INVALID-DEADLINE))
          (try! (stx-transfer? amount tx-sender (as-contract tx-sender)))
          (let ((current-contrib (get-lender-contribution pool-id tx-sender)))
            (map-set lender-contributions { pool-id: pool-id, lender: tx-sender } (+ current-contrib amount))
          )
          (map-set pools pool-id (merge p { total-funds: (+ (get total-funds p) amount) }))
          (print { event: "lent-to-pool", pool-id: pool-id, amount: amount, lender: tx-sender })
          (ok true)
        )
      (err ERR-POOL-NOT-FOUND)
    )
  )
)
(define-public (withdraw-from-pool (pool-id uint) (amount uint))
  (let ((pool (map-get? pools pool-id)))
    (match pool
      p
        (begin
          (asserts! (get status p) (err ERR-POOL-CLOSED))
          (asserts! (<= block-height (get deadline p)) (err ERR-INVALID-DEADLINE))
          (let ((contrib (get-lender-contribution pool-id tx-sender)))
            (asserts! (>= contrib amount) (err ERR-INVALID-WITHDRAW-AMOUNT))
            (try! (as-contract (stx-transfer? amount tx-sender tx-sender)))
            (map-set lender-contributions { pool-id: pool-id, lender: tx-sender } (- contrib amount))
            (map-set pools pool-id (merge p { total-funds: (- (get total-funds p) amount) }))
            (print { event: "withdrawn-from-pool", pool-id: pool-id, amount: amount, lender: tx-sender })
            (ok true)
          )
        )
      (err ERR-POOL-NOT-FOUND)
    )
  )
)
(define-public (update-pool
  (pool-id uint)
  (update-min-contrib uint)
  (update-max-fund uint)
  (update-deadline uint)
)
  (let ((pool (map-get? pools pool-id)))
    (match pool
      p
        (begin
          (asserts! (is-eq (get creator p) tx-sender) (err ERR-NOT-AUTHORIZED))
          (try! (validate-min-contrib update-min-contrib))
          (try! (validate-max-fund update-max-fund))
          (try! (validate-deadline update-deadline))
          (asserts! (get status p) (err ERR-POOL-UPDATE-NOT-ALLOWED))
          (map-set pools pool-id
            (merge p {
              min-contrib: update-min-contrib,
              max-fund: update-max-fund,
              deadline: update-deadline,
              timestamp: block-height
            })
          )
          (map-set pool-updates pool-id
            {
              update-min-contrib: update-min-contrib,
              update-max-fund: update-max-fund,
              update-deadline: update-deadline,
              update-timestamp: block-height,
              updater: tx-sender
            }
          )
          (print { event: "pool-updated", id: pool-id })
          (ok true)
        )
      (err ERR-POOL-NOT-FOUND)
    )
  )
)
(define-public (close-pool (pool-id uint))
  (let ((pool (map-get? pools pool-id)))
    (match pool
      p
        (begin
          (asserts! (is-eq (get creator p) tx-sender) (err ERR-NOT-AUTHORIZED))
          (asserts! (get status p) (err ERR-INVALID-STATUS))
          (map-set pools pool-id (merge p { status: false }))
          (print { event: "pool-closed", id: pool-id })
          (ok true)
        )
      (err ERR-POOL-NOT-FOUND)
    )
  )
)
(define-public (get-pool-count)
  (ok (var-get next-pool-id))
)
(define-public (check-pool-existence (proposal-id uint))
  (ok (is-pool-registered proposal-id))
)