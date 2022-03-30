use anchor_lang::prelude::*;
use crate::state::Store;
use crate::SEED_STORE;

pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
    let store = &mut ctx.accounts.store;
    store.owner = *ctx.accounts.owner.key;
    store.bank = *ctx.accounts.bank.key;
    store.bump = *ctx.bumps.get("store").unwrap();
    Ok(())
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    /// CHECK: read_only
    pub bank: AccountInfo<'info>,

    #[account(init,
    seeds = [SEED_STORE.as_ref(), owner.key().as_ref()],
    bump,
    space = 10240,
    payer = owner)]
    pub store: Account<'info, Store>,

    pub system_program: Program<'info, System>,
}
