use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::invoke;
use anchor_lang::solana_program::system_instruction;
use crate::state::Store;
use crate::SEED_STORE;

pub fn make_donations(ctx: Context<Donate>, lamports: u64) -> Result<()> {
    let from = &ctx.accounts.from;
    let bank = &ctx.accounts.bank;
    let result = invoke(&system_instruction::transfer(
        from.key, bank.key,
        lamports), &[from.to_account_info(), bank.to_account_info()],
    );
    match result {
        Ok(_) => {
            let store = &mut ctx.accounts.store;
            store.put_donate(from.key(), lamports);
            Ok(())
        }
        Err(err) => Err(Error::from(err))
    }
}


#[derive(Accounts)]
pub struct Donate<'info> {
    #[account(mut)]
    pub from: Signer<'info>,

    #[account(mut, address = store.bank.key())]
    /// CHECK: mut and address = store.bank.key()
    pub bank: AccountInfo<'info>,

    pub system_program: Program<'info, System>,

    #[account(
    mut,
    seeds = [SEED_STORE.as_ref(), store.owner.key().as_ref()],
    bump = store.bump)]
    pub store: Account<'info, Store>,
}
