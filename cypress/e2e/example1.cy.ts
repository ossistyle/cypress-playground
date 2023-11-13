describe('Example #1', { tags: ['@example1'] }, () => {
  before(() => {
    cy.log('global retryableBefore');
  });

  beforeEach(() => {
    cy.log('global beforeEach');
  });

  it('#1', () => {
    cy.log('from it');

    expect(true).to.be.true;
  });

  it('#2', () => {
    cy.log('from it 2');
    cy.wrap({}).then(() => {
      // @ts-expect-error works as expected
      cy.state('runnable').ctx.skip();
    });
    expect(false).to.be.false;
  });

  it('#3', () => {
    cy.log('from it 2');
    expect(false).to.be.false;
  });

  afterEach(() => {
    cy.log('#1 afterEach');
  });

  after(() => {
    cy.log('#1 after');
  });
});
