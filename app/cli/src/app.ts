import {
    clusterApiUrl,
    Connection,
    Keypair,
    LAMPORTS_PER_SOL,
    PublicKey,
    SystemProgram,
    Transaction
} from "@solana/web3.js"
import {readFileSync} from "fs"
import * as anchor from "@project-serum/anchor"
import {BN, Program, Provider} from "@project-serum/anchor"
import {IDL, SolanaProject} from "./solana_project"
import _ from "lodash"

const PROGRAM_ID = "D1wdCFggRdEXEYHTgVYBxVF8DQDJe3xRbe9QhQiYEnx2"
const SEED_STORE = "store"

function readKeypairFromPath(path: string): Keypair {
    const data = JSON.parse(readFileSync(path, "utf-8"))
    return Keypair.fromSecretKey(Buffer.from(data))
}

function initProvider(): Provider {
    process.env.ANCHOR_WALLET = "../../localnet/bob.json"
    const provider = Provider.local(clusterApiUrl('devnet'))
    anchor.setProvider(provider)
    return anchor.getProvider()
}

async function initStore(bank: PublicKey, owner: Keypair,
                         storePubKey: PublicKey, program: Program<SolanaProject>) {
    await program.rpc.initialize({
        accounts: {
            bank: bank,
            owner: owner.publicKey,
            store: storePubKey,
            systemProgram: SystemProgram.programId,
        },
        signers: [owner],
    })
}

async function initPayer(connection: Connection): Promise<Keypair> {
    const payerKeyPair = Keypair.generate();
    await connection.confirmTransaction(
        await connection.requestAirdrop(payerKeyPair.publicKey, LAMPORTS_PER_SOL * 2)
    )
    return payerKeyPair
}

async function generateUser(provider: Provider, payerKeyPair: Keypair): Promise<Keypair> {
    const userKeyPair = Keypair.generate()
    await provider.send(
        (() => {
            const tx = new Transaction()
            tx.add(
                SystemProgram.transfer({
                    fromPubkey: payerKeyPair.publicKey,
                    toPubkey: userKeyPair.publicKey,
                    lamports: 1_000_000,
                }),
            )
            return tx
        })(),
        [payerKeyPair],
    )
    return userKeyPair
}

async function makeDonations(sum: BN, from: Keypair, bank: PublicKey, store: PublicKey, program: Program<SolanaProject>) {
    await program.rpc.makeDonations(sum, {
        accounts: {
            from: from.publicKey,
            bank: bank,
            systemProgram: SystemProgram.programId,
            store: store,
        },
        signers: [from],
    })
}

function collectUsersAndDonation(users: PublicKey[], donation: BN[]): Map<string, BN[]> {
    const pairs = _.zip(users, donation)
    const map: Map<string, BN[]> = new Map()
    for (let pair of pairs) {
        if (!map.has(pair[0].toBase58())) {
            map.set(pair[0].toBase58(), [])
        }
        map.get(pair[0].toBase58()).push(pair[1])
    }
    return map
}

async function withdrawDonations(lamports: BN, owner: PublicKey, bank: Keypair, store: PublicKey, program: Program<SolanaProject>) {
    await program.rpc.withdrawDonations(lamports, {
        accounts: {
            bank: bank.publicKey,
            owner: owner,
            systemProgram: SystemProgram.programId,
            store: store,
        },
        signers: [bank],
    })
}

async function main() {
    const provider = initProvider()
    const connection = provider.connection
    const program = new Program(IDL, PROGRAM_ID, provider)

    const payer = await initPayer(connection)

    const owner = readKeypairFromPath("../../localnet/bob.json")

    const [storePubKey] = await PublicKey.findProgramAddress([Buffer.from(SEED_STORE), owner.publicKey.toBuffer()],
        program.programId)

    // store has already been created
    // await initStore(bank.publicKey, owner, storePubKey, program)

    const user0 = await generateUser(provider, payer)
    const user1 = await generateUser(provider, payer)

    let store = await program.account.store.fetch(storePubKey)
    await makeDonations(new BN("100001"), user0, store.bank, storePubKey, program)
    await makeDonations(new BN("100002"), user1, store.bank, storePubKey, program)
    await makeDonations(new BN("100003"), user1, store.bank, storePubKey, program)
    store = await program.account.store.fetch(storePubKey)
    const donation = collectUsersAndDonation(store.users, store.donation)
    for (const elem of donation) {
        console.log(elem)
    }

    const bank = readKeypairFromPath("../../localnet/bank.json")
    console.log("before", await connection.getAccountInfo(owner.publicKey))
    await withdrawDonations(new BN("100000"), owner.publicKey, bank, storePubKey, program)
    console.log("after", await connection.getAccountInfo(owner.publicKey))
}

main()
    .then(() => process.exit(0))
    .catch((err) => console.error(err))