package linkpreview

import (
	"context"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/net/html"

	"zync-server/internal/httpapi/response"
)

type previewResult struct {
	URL         string `json:"url"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Image       string `json:"image"`
	SiteName    string `json:"site_name"`
}

// GET /api/link-preview?url=https://...
func getLinkPreview() gin.HandlerFunc {
	client := &http.Client{
		Timeout: 5 * time.Second,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			if len(via) >= 3 {
				return http.ErrUseLastResponse
			}
			return nil
		},
	}

	return func(c *gin.Context) {
		rawURL := c.Query("url")
		if rawURL == "" {
			response.Error(c, http.StatusBadRequest, "missing_url", "url query parameter is required")
			return
		}

		parsed, err := url.ParseRequestURI(rawURL)
		if err != nil || (parsed.Scheme != "http" && parsed.Scheme != "https") {
			response.Error(c, http.StatusBadRequest, "invalid_url", "url must be a valid http/https URL")
			return
		}

		ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
		defer cancel()

		req, _ := http.NewRequestWithContext(ctx, http.MethodGet, rawURL, nil)
		req.Header.Set("User-Agent", "ZyncBot/1.0 (+https://zync.app)")
		req.Header.Set("Accept", "text/html")

		resp, err := client.Do(req)
		if err != nil {
			response.Error(c, http.StatusBadGateway, "fetch_failed", "Could not fetch URL")
			return
		}
		defer resp.Body.Close()

		ct := resp.Header.Get("Content-Type")
		if !strings.HasPrefix(ct, "text/html") {
			response.OK(c, previewResult{URL: rawURL})
			return
		}

		body := io.LimitReader(resp.Body, 512*1024) // 512 KB max
		result := scrapeOG(rawURL, body)
		response.OK(c, result)
	}
}

func scrapeOG(pageURL string, r io.Reader) previewResult {
	res := previewResult{URL: pageURL}
	z := html.NewTokenizer(r)
	inHead := false
	inTitle := false

	for {
		tt := z.Next()
		switch tt {
		case html.ErrorToken:
			return res
		case html.StartTagToken, html.SelfClosingTagToken:
			name, hasAttr := z.TagName()
			tag := string(name)
			switch tag {
			case "head":
				inHead = true
			case "body":
				return res // stop after head
			case "title":
				if inHead {
					inTitle = true
				}
			case "meta":
				if !hasAttr {
					continue
				}
				attrs := map[string]string{}
				for {
					k, v, more := z.TagAttr()
					attrs[string(k)] = string(v)
					if !more {
						break
					}
				}
				prop := attrs["property"]
				name2 := attrs["name"]
				content := attrs["content"]
				switch prop {
				case "og:title":
					if res.Title == "" {
						res.Title = content
					}
				case "og:description":
					if res.Description == "" {
						res.Description = content
					}
				case "og:image":
					if res.Image == "" {
						res.Image = content
					}
				case "og:site_name":
					if res.SiteName == "" {
						res.SiteName = content
					}
				}
				switch name2 {
				case "description":
					if res.Description == "" {
						res.Description = content
					}
				case "twitter:title":
					if res.Title == "" {
						res.Title = content
					}
				case "twitter:description":
					if res.Description == "" {
						res.Description = content
					}
				case "twitter:image":
					if res.Image == "" {
						res.Image = content
					}
				}
			}
		case html.TextToken:
			if inTitle && res.Title == "" {
				res.Title = strings.TrimSpace(string(z.Text()))
				inTitle = false
			}
		case html.EndTagToken:
			name, _ := z.TagName()
			if string(name) == "title" {
				inTitle = false
			}
		}
	}
}
