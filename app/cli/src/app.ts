import {
    Keypair, SystemProgram,
    Transaction, PublicKey,
    clusterApiUrl, LAMPORTS_PER_SOL, Connection
} from "@solana/web3.js"
import {readFileSync} from "fs"
import {BN, Program, Provider} from "@project-serum/anchor"
import * as anchor from '@project-serum/anchor'
import {IDL, SolanaProject} from "./solana_project"
import _ from "lodash"

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

async function initStore(program: Program<SolanaProject>, storePublicKey: PublicKey, botKeypair: Keypair) {
    await program.rpc.initialize({
        accounts: {
            store: storePublicKey,
            owner: botKeypair.publicKey,
            systemProgram: SystemProgram.programId,
        },
        signers: [botKeypair],
    })
}

async function initPayer(connection: Connection): Promise<Keypair> {
    const payerKeyPair = Keypair.generate();
    await connection.confirmTransaction(
        await connection.requestAirdrop(payerKeyPair.publicKey, LAMPORTS_PER_SOL * 2)
    )
    return payerKeyPair
}

async function initBot(provider: Provider, payerKeyPair: Keypair): Promise<Keypair> {
    const botKeypair = readKeypairFromPath("../../localnet/bot.json")
    await provider.send(
        (() => {
            const tx = new Transaction()
            tx.add(
                SystemProgram.transfer({
                    fromPubkey: payerKeyPair.publicKey,
                    toPubkey: botKeypair.publicKey,
                    lamports: LAMPORTS_PER_SOL,
                }),
            )
            return tx
        })(),
        [payerKeyPair],
    )
    return botKeypair
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

async function makeDonations(sum: BN, program: Program<SolanaProject>,
                             userKeyPair: Keypair, to: PublicKey, store: PublicKey) {
    await program.rpc.makeDonations(sum, {
        accounts: {
            from: userKeyPair.publicKey,
            to: to,
            systemProgram: SystemProgram.programId,
            store: store,
        },
        signers: [userKeyPair],
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

async function withdrawDonations(program: Program<SolanaProject>, owner: Keypair, to: PublicKey) {
    await program.rpc.withdrawDonations({
        accounts: {
            owner: owner.publicKey,
            to: to,
            systemProgram: SystemProgram.programId,
        },
        signers: [owner],
    })
}

async function main() {
    const provider = initProvider()
    const connection = provider.connection
    const programId = "D1wdCFggRdEXEYHTgVYBxVF8DQDJe3xRbe9QhQiYEnx2"
    const program = new Program(IDL, programId, provider)

    const payerKeyPair = await initPayer(connection)
    const botKeypair = await initBot(provider, payerKeyPair)

    const [storePublicKey] = await PublicKey.findProgramAddress([Buffer.from("store_")], program.programId)

    // store has already been created
    // await initStore(program, storePublicKey, botKeypair)

    const user0KeyPair = await generateUser(provider, payerKeyPair)
    const user1KeyPair = await generateUser(provider, payerKeyPair)

    let store = await program.account.store.fetch(storePublicKey)
    await makeDonations(new BN("100001"), program, user0KeyPair, store.owner, storePublicKey)
    await makeDonations(new BN("100002"), program, user1KeyPair, store.owner, storePublicKey)
    await makeDonations(new BN("100003"), program, user1KeyPair, store.owner, storePublicKey)
    store = await program.account.store.fetch(storePublicKey)
    const donation = collectUsersAndDonation(store.users, store.donation)
    for (let elem of donation) {
        console.log(elem)
    }

    const user3KeyPair = Keypair.generate()
    await withdrawDonations(program, botKeypair, user3KeyPair.publicKey)
    const user3 = await connection.getAccountInfo(user3KeyPair.publicKey)
    console.log(user3)
}

main()
    .then(() => process.exit(0))
    .catch((err) => console.error(err))