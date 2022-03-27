use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::invoke;
use anchor_lang::solana_program::system_instruction;

pub fn withdraw_donations(ctx: Context<Withdraw>) -> Result<()> {
    let owner = &ctx.accounts.owner;
    let to = &ctx.accounts.to;
    let lamports = **owner.to_account_info().lamports.borrow();
    let result = invoke(&system_instruction::transfer(
        owner.key, to.key,
        lamports), &[owner.to_account_info(), to.to_account_info()],
    );
    match result {
        Ok(_) => Ok(()),
        Err(err) => Err(Error::from(err))
    }
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(mut)]
    /// CHECK: mut
    pub to: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}
