module.exports = async (bot, db) => {
	var columns = await db.query(`
		select column_name from information_schema.columns
		where table_name = 'bundles'`);

	if(columns.rows?.[0] && columns.rows.find(x => x.column_name == 'pass')) return;

	await db.query(`ALTER TABLE bundles ADD COLUMN pass TEXT`);
	return;
}