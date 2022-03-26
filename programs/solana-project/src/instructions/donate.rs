use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::invoke;
use anchor_lang::solana_program::system_instruction;
use crate::state::Store;

pub fn donate(ctx: Context<Donate>, lamports: u64) -> Result<()> {
    let from = &ctx.accounts.from;
    let to = &ctx.accounts.store.owner;
    let result = invoke(&system_instruction::transfer(
        from.key, &to.key(), lamports),
                        &[from.to_account_info()]);
    match result {
        Ok(_) => Ok(()),
        Err(err) => Err(Error::from(err))
    }
}

#[derive(Accounts)]
pub struct Donate<'info> {
    #[account(mut)]
    pub store: Account<'info, Store>,
    #[account(mut)]
    pub from: Signer<'info>,
    pub system_program: Program<'info, System>,
}
