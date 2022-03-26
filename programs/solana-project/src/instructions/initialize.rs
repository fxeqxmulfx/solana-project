use anchor_lang::prelude::*;
use crate::state::Store;

pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
    let store = &mut ctx.accounts.store;
    store.owner = *ctx.accounts.owner.key;
    Ok(())
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = owner, space = 1024)]
    pub store: Account<'info, Store>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}
