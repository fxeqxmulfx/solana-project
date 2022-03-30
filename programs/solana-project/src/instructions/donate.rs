use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::invoke;
use anchor_lang::solana_program::system_instruction;
use crate::state::{Store, UserStore};
use crate::SEED_STORE;
use crate::SEED_STORE_USER;

pub fn make_donations(ctx: Context<Donate>, lamports: u64) -> Result<()> {
    let from = &ctx.accounts.from_user;
    let bank = &ctx.accounts.bank;
    let result = invoke(&system_instruction::transfer(
        from.key, bank.key,
        lamports), &[from.to_account_info(), bank.to_account_info()],
    );
    match result {
        Ok(_) => {
            ctx.accounts.store.put_donate(from.key());
            ctx.accounts.user_store.put_donate(lamports);
            Ok(())
        }
        Err(err) => Err(Error::from(err))
    }
}


#[derive(Accounts)]
pub struct Donate<'info> {
    #[account(mut, address = user_store.user.key())]
    pub from_user: Signer<'info>,

    #[account(mut, address = store.bank.key())]
    /// CHECK: mut and address = store.bank.key()
    pub bank: AccountInfo<'info>,

    pub system_program: Program<'info, System>,

    #[account(
    mut,
    seeds = [SEED_STORE.as_ref(), store.owner.key().as_ref()],
    bump = store.bump)]
    pub store: Account<'info, Store>,

    #[account(
    mut,
    seeds = [SEED_STORE_USER.as_ref(), user_store.user.key().as_ref()],
    bump = user_store.bump,
    constraint = store.bank.key() == user_store.bank.key())]
    pub user_store: Account<'info, UserStore>,
}
