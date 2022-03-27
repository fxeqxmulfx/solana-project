import * as anchor from "@project-serum/anchor"
import {Program} from "@project-serum/anchor"
import {SolanaProject} from "../target/types/solana_project"
import {SystemProgram, Transaction} from '@solana/web3.js';
import {assert, expect} from "chai";

describe("solana-project", async () => {
    anchor.setProvider(anchor.Provider.env())
    const provider = anchor.getProvider()
    const program = anchor.workspace.SolanaProject as Program<SolanaProject>
    const systemProgram = anchor.web3.SystemProgram.programId

    const payer = anchor.web3.Keypair.generate()

    const [store] = await anchor.web3.PublicKey
        .findProgramAddress([anchor.utils.bytes.utf8.encode("store")],
            program.programId)
    const bot = anchor.web3.Keypair.generate()
    const user = anchor.web3.Keypair.generate()
    const user2 = anchor.web3.Keypair.generate()
    const user3 = anchor.web3.Keypair.generate()

    it("Initialize program state", async () => {
        await provider.connection.confirmTransaction(
            await provider.connection.requestAirdrop(payer.publicKey, 100_000_000_000),
            "processed",
        )
        await provider.send(
            (() => {
                const tx = new Transaction()
                tx.add(
                    SystemProgram.transfer({
                        fromPubkey: payer.publicKey,
                        toPubkey: user.publicKey,
                        lamports: 10_000_000_000,
                    }),
                    SystemProgram.transfer({
                        fromPubkey: payer.publicKey,
                        toPubkey: user2.publicKey,
                        lamports: 10_000_000_000,
                    }),
                    SystemProgram.transfer({
                        fromPubkey: payer.publicKey,
                        toPubkey: bot.publicKey,
                        lamports: 10_000_000_000,
                    }),
                )
                return tx
            })(),
            [payer],
        )
    })

    it("Test initialize", async () => {
        await program.rpc.initialize({
            accounts: {
                store: store,
                owner: bot.publicKey,
                systemProgram: systemProgram,
            },
            signers: [bot],
        })
        const tempStore = await program.account.store.fetch(store)
        expect(tempStore.owner).to.eql(bot.publicKey)
    })

    it("Test donate", async () => {
        let store_ = await program.account.store.fetch(store)
        await program.rpc.makeDonations(new anchor.BN("100000"), {
            accounts: {
                from: user.publicKey,
                to: store_.owner,
                systemProgram: systemProgram,
                store: store,
            },
            signers: [user],
        })
        await program.rpc.makeDonations(new anchor.BN("100500"), {
            accounts: {
                from: user2.publicKey,
                to: store_.owner,
                systemProgram: systemProgram,
                store: store,
            },
            signers: [user2],
        })
        store_ = await program.account.store.fetch(store)
        expect(store_.users).to.eql([user.publicKey, user2.publicKey])
        assert.isTrue((() => {
            const expected = [new anchor.BN("100000"), new anchor.BN("100500")]
            for (let i = 0, len = store_.donation.length; i < len; i++) {
                if (store_.donation[i].cmp(expected[i]) != 0) {
                    return false
                }
            }
            return true
        })())
    })

    it("Test withdraw", async () => {
        await program.rpc.withdrawDonations({
            accounts: {
                owner: bot.publicKey,
                to: user3.publicKey,
                systemProgram: systemProgram,
            },
            signers: [bot],
        })
        const account = await anchor.getProvider().connection.getAccountInfo(user3.publicKey)
        expect(account.lamports).to.not.eq(0)
    })
})
