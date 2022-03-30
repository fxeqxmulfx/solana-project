use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::invoke;
use anchor_lang::solana_program::system_instruction;
use crate::state::Store;
use crate::SEED_STORE;

pub fn withdraw_donations(ctx: Context<Withdraw>, lamports: u64) -> Result<()> {
    let bank = &ctx.accounts.bank;
    let owner = &ctx.accounts.owner;
    let result = invoke(&system_instruction::transfer(
        bank.key, owner.key,
        lamports), &[bank.to_account_info(), owner.to_account_info()],
    );
    match result {
        Ok(_) => Ok(()),
        Err(err) => Err(Error::from(err))
    }
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut, address = store.bank.key())]
    pub bank: Signer<'info>,

    #[account(mut, address = store.owner.key())]
    /// CHECK: mut
    pub owner: AccountInfo<'info>,

    pub system_program: Program<'info, System>,

    #[account(
    mut,
    seeds = [SEED_STORE.as_ref(), store.owner.key().as_ref()],
    bump = store.bump)]
    pub store: Account<'info, Store>,
}
