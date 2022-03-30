import * as anchor from "@project-serum/anchor"
import {Program, utils} from "@project-serum/anchor"
import {SolanaProject} from "../target/types/solana_project"
import {Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction} from '@solana/web3.js';
import {assert, expect} from "chai";

describe("solana-project", async () => {
    anchor.setProvider(anchor.Provider.env())
    const provider = anchor.getProvider()
    const program = anchor.workspace.SolanaProject as Program<SolanaProject>
    const systemProgram = SystemProgram.programId

    const payer = Keypair.generate()

    const owner = Keypair.generate()
    const [store] = await PublicKey
        .findProgramAddress([utils.bytes.utf8.encode("store"), owner.publicKey.toBytes()],
            program.programId)
    const [fakeStore] = await PublicKey
        .findProgramAddress([utils.bytes.utf8.encode("fake-store"), owner.publicKey.toBytes()],
            program.programId)
    const bank = Keypair.generate()
    const fakeBank = Keypair.generate()

    const user1 = Keypair.generate()
    const user2 = Keypair.generate()

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

    it("Test: correct donation", async () => {
        let store_ = await program.account.store.fetch(store)
        await program.rpc.makeDonations(new anchor.BN("1000000"), {
            accounts: {
                from: user1.publicKey,
                bank: store_.bank,
                systemProgram: systemProgram,
                store: store,
            },
            signers: [user1],
        })
        await program.rpc.makeDonations(new anchor.BN("1005000"), {
            accounts: {
                from: user2.publicKey,
                bank: store_.bank,
                systemProgram: systemProgram,
                store: store,
            },
            signers: [user2],
        })
        store_ = await program.account.store.fetch(store)
        expect(store_.users).to.eql([user1.publicKey, user2.publicKey])
        assert.isTrue((() => {
            const expected = [new anchor.BN("1000000"), new anchor.BN("1005000")]
            for (let i = 0, len = store_.donation.length; i < len; i++) {
                if (store_.donation[i].cmp(expected[i]) != 0) {
                    return false
                }
            }
            return true
        })())
    })

    it("Test: incorrect donation", async () => {
        let err
        try {
            let store_ = await program.account.store.fetch(fakeStore)
            await program.rpc.makeDonations(new anchor.BN("1000000"), {
                accounts: {
                    from: user1.publicKey,
                    bank: store_.bank,
                    systemProgram: systemProgram,
                    store: fakeStore,
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

    it("Test: checking the withdrawal from a fake bank, to the onwer", async () => {
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
