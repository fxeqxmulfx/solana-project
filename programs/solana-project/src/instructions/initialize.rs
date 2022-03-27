use anchor_lang::prelude::*;
use crate::state::Store;

pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
    let store = &mut ctx.accounts.store;
    store.owner = *ctx.accounts.owner.key;
    msg!("{:?}", ctx.bumps.get("store"));
    store.bump = *ctx.bumps.get("store").unwrap();
    Ok(())
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init,
    seeds = [b"store"],
    bump,
    space = 1024,
    payer = owner)]
    pub store: Account<'info, Store>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}
