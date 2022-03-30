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

const PROGRAM_ID = "D1wdCFggRdEXEYHTgVYBxVF8DQDJe3xRbe9QhQiYEnx2"
const SEED_STORE = "seed_store"
const SEED_STORE_USER = "user_store"

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
                         store: PublicKey, program: Program<SolanaProject>) {
    await program.rpc.initialize({
        accounts: {
            bank: bank,
            owner: owner.publicKey,
            store: store,
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

async function generateUser(bank: PublicKey, store: PublicKey,
                            payer: Keypair, provider: Provider,
                            program: Program<SolanaProject>): Promise<[Keypair, PublicKey]> {
    const user = Keypair.generate()
    await provider.send(
        (() => {
            const tx = new Transaction()
            tx.add(
                SystemProgram.transfer({
                    fromPubkey: payer.publicKey,
                    toPubkey: user.publicKey,
                    lamports: 500_000_000,
                }),
            )
            return tx
        })(),
        [payer],
    )
    const [userStore] = await PublicKey.findProgramAddress(
        [Buffer.from(SEED_STORE_USER), user.publicKey.toBuffer()],
        program.programId)
    await program.rpc.initializeUser({
        accounts: {
            user: user.publicKey,
            userStore: userStore,
            bank: bank,
            store: store,
            systemProgram: SystemProgram.programId,
        },
        signers: [user],
    })
    return [user, userStore]
}

async function makeDonations(sum: BN, from: Keypair, fromStore: PublicKey, bank: PublicKey, store: PublicKey, program: Program<SolanaProject>) {
    await program.rpc.makeDonations(sum, {
        accounts: {
            fromUser: from.publicKey,
            userStore: fromStore,
            bank: bank,
            systemProgram: SystemProgram.programId,
            store: store,
        },
        signers: [from],
    })
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
    const bank = readKeypairFromPath("../../localnet/bank.json")
    const owner = readKeypairFromPath("../../localnet/bob.json")

    const [storePubKey] = await PublicKey.findProgramAddress(
        [Buffer.from(SEED_STORE), owner.publicKey.toBuffer()],
        program.programId)

    // store has already been created
    // await initStore(bank.publicKey, owner, storePubKey, program)

    const [user0, user0Store] = await generateUser(bank.publicKey, storePubKey, payer, provider, program)
    const [user1, user1Store] = await generateUser(bank.publicKey, storePubKey, payer, provider, program)

    let store = await program.account.store.fetch(storePubKey)
    await makeDonations(new BN("100001"), user0, user0Store, store.bank, storePubKey, program)
    await makeDonations(new BN("100002"), user1, user1Store, store.bank, storePubKey, program)
    await makeDonations(new BN("100003"), user1, user1Store, store.bank, storePubKey, program)
    store = await program.account.store.fetch(storePubKey)
    console.log("users")
    for (const user of store.users) {
        console.log(user.toBase58())
    }
    console.log()
    console.log("donations")
    for (const user of store.users) {
        console.log(user.toBase58())
        const [userStore] = await PublicKey.findProgramAddress(
            [Buffer.from(SEED_STORE_USER), user.toBuffer()],
            program.programId)
        const userStore_ = await program.account.userStore.fetch(userStore)
        for (let donation of userStore_.donation) {
            console.log(donation.toNumber())
        }
    }
    console.log()
    console.log("before", await connection.getAccountInfo(owner.publicKey))
    await withdrawDonations(new BN("100000"), owner.publicKey, bank, storePubKey, program)
    console.log()
    console.log("after", await connection.getAccountInfo(owner.publicKey))
}

main()
    .then(() => process.exit(0))
    .catch((err) => console.error(err))