"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Translation {
  id: number;
  name: string;
  authorName: string;
  slug: string;
  languageName: string;
  translatedName: { name: string; languageName: string };
}

export default function QuranDebugPage() {
  const [translations, setTranslations] = useState<Translation[]>([]);
  const [allTranslations, setAllTranslations] = useState<Translation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState("");

  // Verse test state
  const [ayahKey, setAyahKey] = useState("1:1");
  const [resourceId, setResourceId] = useState("20");
  const [verseResult, setVerseResult] = useState<Record<string, unknown> | null>(null);
  const [verseLoading, setVerseLoading] = useState(false);

  const fetchTranslations = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/quran/translations");
      const data = await response.json();
      if (data.error) {
        setError(data.error);
      } else {
        setTranslations(data.translations || []);
        setAllTranslations(data.all || []);
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  const fetchVerse = async () => {
    setVerseLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/quran/translation?resourceId=${resourceId}&ayahKey=${ayahKey}`
      );
      const data = await response.json();
      setVerseResult(data);
    } catch (err) {
      setError(String(err));
    } finally {
      setVerseLoading(false);
    }
  };

  const filteredEnglish = translations.filter(
    (t) =>
      t.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      t.authorName?.toLowerCase().includes(searchFilter.toLowerCase()) ||
      String(t.id).includes(searchFilter)
  );

  const filteredAll = allTranslations.filter(
    (t) =>
      t.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      t.authorName?.toLowerCase().includes(searchFilter.toLowerCase()) ||
      String(t.id).includes(searchFilter)
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Quran Foundation API Debug</h1>

      {error && (
        <div className="bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-4 rounded">
          {error}
        </div>
      )}

      {/* Translations Explorer */}
      <Card>
        <CardHeader>
          <CardTitle>Available Translations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button onClick={fetchTranslations} disabled={loading}>
              {loading ? "Loading..." : "Fetch Translations"}
            </Button>
            <Input
              placeholder="Filter by name, author, or ID..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="max-w-xs"
            />
          </div>

          {filteredEnglish.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">
                English Translations ({filteredEnglish.length})
              </h3>
              <div className="max-h-96 overflow-auto border rounded">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0">
                    <tr>
                      <th className="p-2 text-left">ID</th>
                      <th className="p-2 text-left">Name</th>
                      <th className="p-2 text-left">Author</th>
                      <th className="p-2 text-left">Slug</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEnglish.map((t) => (
                      <tr
                        key={t.id}
                        className="border-t hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      >
                        <td className="p-2 font-mono">{t.id}</td>
                        <td className="p-2">{t.name}</td>
                        <td className="p-2">{t.authorName}</td>
                        <td className="p-2 text-slate-500">{t.slug}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {filteredAll.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">
                All Translations ({filteredAll.length})
              </h3>
              <div className="max-h-96 overflow-auto border rounded">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0">
                    <tr>
                      <th className="p-2 text-left">ID</th>
                      <th className="p-2 text-left">Name</th>
                      <th className="p-2 text-left">Author</th>
                      <th className="p-2 text-left">Language</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAll.map((t) => (
                      <tr
                        key={t.id}
                        className="border-t hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      >
                        <td className="p-2 font-mono">{t.id}</td>
                        <td className="p-2">{t.name}</td>
                        <td className="p-2">{t.authorName}</td>
                        <td className="p-2 text-slate-500">{t.languageName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Verse Test */}
      <Card>
        <CardHeader>
          <CardTitle>Test Verse Translation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 items-end">
            <div>
              <Label>Ayah Key (e.g., 1:1, 2:255)</Label>
              <Input
                value={ayahKey}
                onChange={(e) => setAyahKey(e.target.value)}
                className="w-32"
              />
            </div>
            <div>
              <Label>Resource ID</Label>
              <Input
                value={resourceId}
                onChange={(e) => setResourceId(e.target.value)}
                className="w-24"
              />
            </div>
            <Button onClick={fetchVerse} disabled={verseLoading}>
              {verseLoading ? "Loading..." : "Fetch Verse"}
            </Button>
          </div>

          {verseResult && (
            <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded overflow-auto max-h-96">
              <pre className="text-sm">
                {JSON.stringify(verseResult, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Reference */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Reference - Common Translation IDs</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500 mb-2">
            Click &quot;Fetch Translations&quot; above to see all available IDs. Common
            English translations:
          </p>
          <ul className="list-disc list-inside text-sm space-y-1">
            <li>
              <strong>20</strong> - Sahih International
            </li>
            <li>
              <strong>19</strong> - Pickthall
            </li>
            <li>
              <strong>22</strong> - Yusuf Ali
            </li>
            <li>
              <strong>84</strong> - Mufti Taqi Usmani
            </li>
            <li>
              <strong>85</strong> - Abdul Haleem
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
