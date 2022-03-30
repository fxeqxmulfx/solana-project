import * as anchor from "@project-serum/anchor"
import {Program, utils} from "@project-serum/anchor"
import {SolanaProject} from "../target/types/solana_project"
import {Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction} from '@solana/web3.js';
import {assert, expect} from "chai";

const SEED_STORE = "seed_store"
const SEED_STORE_USER = "user_store"

describe("solana-project", async () => {
    anchor.setProvider(anchor.Provider.env())
    const provider = anchor.getProvider()
    const program = anchor.workspace.SolanaProject as Program<SolanaProject>
    const systemProgram = SystemProgram.programId

    const payer = Keypair.generate()

    const owner = Keypair.generate()
    const [store] = await PublicKey
        .findProgramAddress([utils.bytes.utf8.encode(SEED_STORE), owner.publicKey.toBytes()],
            program.programId)
    const [fakeStore] = await PublicKey
        .findProgramAddress([utils.bytes.utf8.encode("fake-store"), owner.publicKey.toBytes()],
            program.programId)
    const bank = Keypair.generate()
    const fakeBank = Keypair.generate()

    const user1 = Keypair.generate()
    const [user1Store] = await PublicKey
        .findProgramAddress([utils.bytes.utf8.encode(SEED_STORE_USER), user1.publicKey.toBytes()],
            program.programId)
    const user2 = Keypair.generate()
    const [user2Store] = await PublicKey
        .findProgramAddress([utils.bytes.utf8.encode(SEED_STORE_USER), user2.publicKey.toBytes()],
            program.programId)

    it("Initialize program state", async () => {
        await provider.connection.confirmTransaction(
            await provider.connection.requestAirdrop(payer.publicKey, LAMPORTS_PER_SOL * 100),
        )
        await provider.send(
            (() => {
                const tx = new Transaction()
                tx.add(
                    SystemProgram.transfer({
                        fromPubkey: payer.publicKey,
                        toPubkey: owner.publicKey,
                        lamports: LAMPORTS_PER_SOL * 10,
                    }),
                    SystemProgram.transfer({
                        fromPubkey: payer.publicKey,
                        toPubkey: user1.publicKey,
                        lamports: LAMPORTS_PER_SOL * 10,
                    }),
                    SystemProgram.transfer({
                        fromPubkey: payer.publicKey,
                        toPubkey: user2.publicKey,
                        lamports: LAMPORTS_PER_SOL * 10,
                    }),
                    SystemProgram.transfer({
                        fromPubkey: payer.publicKey,
                        toPubkey: fakeBank.publicKey,
                        lamports: LAMPORTS_PER_SOL * 10,
                    }),
                )
                return tx
            })(),
            [payer],
        )
    })


    it("Test: initialization", async () => {
        await program.rpc.initialize({
            accounts: {
                owner: owner.publicKey,
                bank: bank.publicKey,
                store: store,
                systemProgram: systemProgram,
            },
            signers: [owner],
        })
        const tempStore = await program.account.store.fetch(store)
        expect(tempStore.owner).to.eql(owner.publicKey)
        expect(tempStore.bank).to.eql(bank.publicKey)
    })

    it("Test: users initialization", async () => {
        await program.rpc.initializeUser({
            accounts: {
                user: user1.publicKey,
                userStore: user1Store,
                bank: bank.publicKey,
                store: store,
                systemProgram: systemProgram,
            },
            signers: [user1],
        })
        let tempStore = await program.account.userStore.fetch(user1Store)
        expect(tempStore.user).to.eql(user1.publicKey)
        expect(tempStore.bank).to.eql(bank.publicKey)
        await program.rpc.initializeUser({
            accounts: {
                user: user2.publicKey,
                userStore: user2Store,
                bank: bank.publicKey,
                store: store,
                systemProgram: systemProgram,
            },
            signers: [user2],
        })
        tempStore = await program.account.userStore.fetch(user2Store)
        expect(tempStore.user).to.eql(user2.publicKey)
        expect(tempStore.bank).to.eql(bank.publicKey)
    })

    it("Test: correct donation", async () => {
        let store_ = await program.account.store.fetch(store)
        await program.rpc.makeDonations(new anchor.BN("1000000"), {
            accounts: {
                fromUser: user1.publicKey,
                bank: store_.bank,
                systemProgram: systemProgram,
                store: store,
                userStore: user1Store,
            },
            signers: [user1],
        })
        await program.rpc.makeDonations(new anchor.BN("1005000"), {
            accounts: {
                fromUser: user2.publicKey,
                bank: store_.bank,
                systemProgram: systemProgram,
                store: store,
                userStore: user2Store,
            },
            signers: [user2],
        })
        store_ = await program.account.store.fetch(store)
        expect(store_.users).to.eql([user1.publicKey, user2.publicKey])

        const store_user_1 = await program.account.userStore.fetch(user1Store)
        assert.isTrue(store_user_1.donation[0].cmp(new anchor.BN("1000000")) === 0)
        const store_user_2 = await program.account.userStore.fetch(user2Store)
        assert.isTrue(store_user_2.donation[0].cmp(new anchor.BN("1005000")) === 0)
    })

    it("Test: incorrect donation", async () => {
        let err
        try {
            let store_ = await program.account.store.fetch(fakeStore)
            await program.rpc.makeDonations(new anchor.BN("1000000"), {
                accounts: {
                    fromUser: user1.publicKey,
                    bank: store_.bank,
                    systemProgram: systemProgram,
                    store: fakeStore,
                    userStore: user2Store,
                },
                signers: [user1],
            })
        } catch (e) {
            err = e
        }
        if (err == null) {
            throw "When trying to make a donation, a new store should not be created"
        }
    })


    it("Test: withdraw", async () => {
        const before = await anchor.getProvider().connection.getAccountInfo(owner.publicKey)
        await program.rpc.withdrawDonations(new anchor.BN("1000000"), {
            accounts: {
                bank: bank.publicKey,
                owner: owner.publicKey,
                systemProgram: systemProgram,
                store: store,
            },
            signers: [bank],
        })
        const after = await anchor.getProvider().connection.getAccountInfo(owner.publicKey)
        assert.isTrue(before.lamports < after.lamports)
    })

    it("Test: checking the withdrawal from the correct bank, to an unknown account", async () => {
        let err
        const keyPair = Keypair.generate()
        try {
            await program.rpc.withdrawDonations(new anchor.BN("1000000"), {
                accounts: {
                    bank: bank.publicKey,
                    owner: keyPair.publicKey,
                    systemProgram: systemProgram,
                    store: store,
                },
                signers: [bank],
            })
        } catch (e) {
            err = e
        }
        if (err == null) {
            throw "The withdrawal to an unknown wallet has passed"
        }
    })

    it("Test: checking the withdrawal from a fake bank, to the owner", async () => {
        let err
        try {
            await program.rpc.withdrawDonations(new anchor.BN("1000000"), {
                accounts: {
                    bank: fakeBank.publicKey,
                    owner: owner.publicKey,
                    systemProgram: systemProgram,
                    store: store,
                },
                signers: [fakeBank],
            })
        } catch (e) {
            err = e
        }
        if (err == null) {
            throw "There was a withdrawal from fake bank"
        }
    })
})
