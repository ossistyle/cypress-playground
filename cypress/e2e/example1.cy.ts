describe('Example #1', { tags: ['@example1'] }, () => {
  before(() => {
    cy.log('before');
  });

  beforeEach(() => {
    cy.log('beforeEach');
  });

  it('test #1', () => {
    cy.log('from it');

    expect(true).to.be.true;
  });

  it('test #2', () => {
    cy.log('from it 2');
    cy.wrap({}).then(() => {
      // @ts-expect-error works as expected
      cy.state('runnable').ctx.skip();
    });
    expect(false).to.be.false;
  });

  it('test #3', () => {
    cy.log('from it 2');
    expect(false).to.be.false;
  });

  afterEach(() => {
    cy.log('afterEach');
  });

  after(() => {
    cy.log('after');
  });
});
