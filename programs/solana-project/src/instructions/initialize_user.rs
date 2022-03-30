use anchor_lang::prelude::*;
use crate::state::{Store, UserStore};
use crate::SEED_STORE;
use crate::SEED_STORE_USER;

pub fn initialize_user(ctx: Context<InitializeUser>) -> Result<()> {
    let store = &mut ctx.accounts.user_store;
    store.user = ctx.accounts.user.key();
    store.bank = ctx.accounts.bank.key();
    msg!("{:?}", ctx.bumps);
    store.bump = ctx.bumps.get("user_store").unwrap().clone();
    Ok(())
}

#[derive(Accounts)]
pub struct InitializeUser<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(init,
    seeds = [SEED_STORE_USER.as_ref(), user.key().as_ref()],
    bump,
    space = 10240,
    payer = user)]
    pub user_store: Account<'info, UserStore>,

    #[account(address = store.bank)]
    /// CHECK: read_only and address = store.bank
    pub bank: AccountInfo<'info>,

    #[account(
    mut,
    seeds = [SEED_STORE.as_ref(), store.owner.key().as_ref()],
    bump = store.bump)]
    pub store: Account<'info, Store>,

    pub system_program: Program<'info, System>,
}
