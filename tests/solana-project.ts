import * as anchor from "@project-serum/anchor"
import {Program} from "@project-serum/anchor"
import {SolanaProject} from "../target/types/solana_project"
import {SystemProgram, Transaction} from '@solana/web3.js';
import {expect} from "chai";

describe("solana-project", () => {
    anchor.setProvider(anchor.Provider.env())
    const provider = anchor.getProvider()
    const program = anchor.workspace.SolanaProject as Program<SolanaProject>
    const systemProgram = anchor.web3.SystemProgram.programId

    const payer = anchor.web3.Keypair.generate()

    const store = anchor.web3.Keypair.generate()
    const bot = anchor.web3.Keypair.generate()
    const user = anchor.web3.Keypair.generate()

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
                        toPubkey: store.publicKey,
                        lamports: 10_000_000_000,
                    }),
                    SystemProgram.transfer({
                        fromPubkey: payer.publicKey,
                        toPubkey: user.publicKey,
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
                store: store.publicKey,
                owner: bot.publicKey,
                systemProgram: systemProgram,
            },
            signers: [store, bot],
        })
        const tempStore = await program.account.store.fetch(store.publicKey)
        expect(tempStore.owner).to.eql(bot.publicKey)
    })

    it("Test donate", async () => {
        const store_ = await program.account.store.fetch(store.publicKey)
        await program.rpc.makeDonations(new anchor.BN("100000"), {
            accounts: {
                from: user.publicKey,
                to: store_.owner,
                systemProgram: systemProgram,
                store: store.publicKey,
            },
            signers: [user],
        })
    })
})
